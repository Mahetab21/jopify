const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomUUID } = require("node:crypto");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { io: connectSocket } = require("socket.io-client");

// Synthetic credentials only; never read a developer's database or provider keys.
Object.assign(process.env, {
  NODE_ENV: "test", SALT_ROUND: "10",
  ACCESS_TOKEN_USER: "test-user-access-key-with-at-least-32-characters",
  ACCESS_TOKEN_ADMIN: "test-admin-access-key-with-at-least-32-characters",
  REFRESH_TOKEN_USER: "test-user-refresh-key-with-at-least-32-characters",
  REFRESH_TOKEN_ADMIN: "test-admin-refresh-key-with-at-least-32-characters",
  BEARER_USER: "Bearer", BEARER_ADMIN: "Bearer",
  FRONTEND_ORIGIN: "http://localhost:3000",
});
const mail = require("../dist/service/sendEmail");
const sentMail = [];
mail.sendEmail = async options => { sentMail.push(options); };
const storage = require("../dist/utils/s3.config");
storage.uploadFile = async () => "test/private/resume.pdf";
storage.deleteFile = async () => {};
const { createApp } = require("../dist/app.controller");
const { initSocket } = require("../dist/socket/socket");
const User = require("../dist/DB/model/user.model").default;
const Job = require("../dist/DB/model/job.model").default;
const Application = require("../dist/DB/model/jobApplication.model").default;
const Revoked = require("../dist/DB/model/revokeToken.model").default;
const Message = require("../dist/DB/model/message.model").default;
const { Hash } = require("../dist/utils/hash");
let mongo, server, sockets, base, seeker, employer, otherEmployer, seekerToken, employerToken, otherToken, jobId;

function token(user) {
  return jwt.sign({ id: user._id.toString(), email: user.email },
    user.role === "job_seeker" ? process.env.ACCESS_TOKEN_USER : process.env.ACCESS_TOKEN_ADMIN,
    { expiresIn: "1h", jwtid: randomUUID() });
}
async function request(method, route, data, accessToken) {
  const headers = {};
  if (accessToken) headers.authorization = "Bearer " + accessToken;
  if (data !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(base + route, { method, headers, ...(data !== undefined && { body: JSON.stringify(data) }) });
  return { status: response.status, body: await response.json() };
}
const userData = (email, role) => ({
  firstName: "Test", lastName: "User", email, password: "TestPassword123",
  age: 24, gender: "female", role, confirmed: true,
});
const jobData = {
  companySnapshot: { name: "Example Company" }, title: "Node.js Developer",
  description: "Build and maintain recruitment APIs using TypeScript, Express and MongoDB.",
  responsibilities: ["Build reliable APIs"], requirements: ["TypeScript knowledge"],
  location: "Cairo", employmentType: "full_time", experienceLevel: "entry_level",
  salaryRange: { min: 10000, max: 20000 }, skillsRequired: ["Node.js"],
  category: "Engineering", openings: 2, isRemote: false,
};
before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), Job.init(), Application.init(), Revoked.init(), Message.init()]);
  [seeker, employer, otherEmployer] = await User.create([
    userData("seeker@example.com", "job_seeker"),
    userData("employer@example.com", "employer"),
    userData("other@example.com", "employer"),
  ]);
  seekerToken = token(seeker); employerToken = token(employer); otherToken = token(otherEmployer);
  server = require("node:http").createServer(createApp());
  sockets = initSocket(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = "http://127.0.0.1:" + server.address().port;
});
after(async () => {
  if (sockets) await new Promise(resolve => sockets.close(resolve));
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test("root and unknown routes return expected responses", async () => {
  assert.equal((await request("GET", "/")).status, 200);
  assert.equal((await request("GET", "/missing")).status, 404);
});
test("public signup rejects admin accounts", async () => {
  const result = await request("POST", "/users/signUp", {
    ...userData("admin@example.com", "admin"), confirmed: undefined,
    cPassword: "TestPassword123", phoneNumber: "01000000000", location: "Cairo",
  });
  assert.equal(result.status, 400);
  assert.equal(await User.countDocuments({ email: "admin@example.com" }), 0);
});
test("signup hashes credentials, hides them in JSON and confirms with its emailed OTP", async () => {
  const result = await request("POST", "/users/signUp", {
    firstName: "New", lastName: "User", email: "new@example.com", password: "TestPassword123",
    cPassword: "TestPassword123", age: 24, gender: "female", role: "job_seeker",
    phoneNumber: "01000000000", location: "Cairo",
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.user.password, undefined);
  assert.equal(result.body.user.otp, undefined);
  const saved = await User.findOne({ email: "new@example.com" });
  assert.notEqual(saved.password, "TestPassword123");
  assert.equal(saved.otpPurpose, "confirm");
  const otp = sentMail.at(-1).html.match(/>\s*(\d{6})\s*</)[1];
  assert.equal((await request("POST", "/users/confirmEmail", { email: saved.email, otp })).status, 200);
  const login = await request("POST", "/users/signIn", { email: saved.email, password: "TestPassword123" });
  assert.equal(login.status, 200);
  assert.ok(login.body.access_token);
  assert.equal(login.body.user.password, undefined);
});
test("expired confirmation codes and confirmation codes used for password reset are rejected", async () => {
  const user = await User.create({ ...userData("expired@example.com", "job_seeker"), confirmed: false,
    otp: await Hash("123456"), otpPurpose: "confirm", otpExpiresAt: new Date(Date.now() - 1000) });
  assert.equal((await request("POST", "/users/confirmEmail", { email: user.email, otp: "123456" })).status, 400);
  assert.equal((await request("PATCH", "/users/resetPassword", {
    email: user.email, otp: "123456", password: "NewPassword123", cPassword: "NewPassword123",
  })).status, 400);
});
test("job seeker cannot create jobs; employer can", async () => {
  assert.equal((await request("POST", "/jobs/create", jobData, seekerToken)).status, 403);
  const result = await request("POST", "/jobs/create", jobData, employerToken);
  assert.equal(result.status, 201);
  jobId = result.body.job._id;
});
test("query coercion preserves false, pagination numbers and literal regex characters", async () => {
  const result = await request("GET", "/jobs/get-all?isRemote=false&page=1&limit=2&search=Node.js");
  assert.equal(result.status, 200);
  assert.equal(result.body.pagination.limit, 2);
  assert.equal(result.body.jobs.length, 1);
  assert.equal(result.body.jobs[0].isRemote, false);
  assert.equal((await request("GET", "/jobs/get-all?search=%5B")).status, 200);
  assert.equal((await request("GET", "/jobs/get-all?limit=999")).status, 400);
});
test("public endpoints hide drafts and reject draft filtering", async () => {
  const draft = await Job.create({ ...jobData, postedBy: employer._id, status: "draft" });
  assert.equal((await request("GET", "/jobs/" + draft._id)).status, 404);
  assert.equal((await request("GET", "/jobs/get-all?status=draft")).status, 400);
});
test("another employer cannot edit a job", async () => {
  assert.equal((await request("PUT", "/jobs/" + jobId, { title: "Unauthorized title" }, otherToken)).status, 403);
});
test("application upload, duplicate prevention and employer statistics", async () => {
  async function apply() {
    const form = new FormData();
    form.append("resume", new Blob(["test resume"], { type: "application/pdf" }), "resume.pdf");
    form.append("coverLetter", "I am interested in this role.");
    const response = await fetch(base + "/job-applications/apply/" + jobId, {
      method: "POST", headers: { authorization: "Bearer " + seekerToken }, body: form,
    });
    return { status: response.status, body: await response.json() };
  }
  const first = await apply();
  assert.equal(first.status, 201);
  assert.equal((await apply()).status, 409);
  assert.equal((await request("GET", "/job-applications/stats", undefined, employerToken)).body.stats.total, 1);
  assert.equal((await request("GET", "/job-applications/stats", undefined, otherToken)).body.stats.total, 0);
  assert.equal((await request("GET", "/job-applications/job/" + jobId, undefined, otherToken)).status, 403);
});
test("unauthenticated and revoked tokens cannot access a profile", async () => {
  assert.equal((await request("GET", "/users/getProfile")).status, 401);
  const revoked = token(seeker);
  const claims = jwt.decode(revoked);
  await Revoked.create({ userId: seeker._id, tokenId: claims.jti, expireAt: new Date(claims.exp * 1000) });
  assert.equal((await request("GET", "/users/getProfile", undefined, revoked)).status, 401);
});
test("employer sockets authenticate and multiple connections retain presence", async () => {
  const first = connectSocket(base, { auth: { token: "Bearer " + employerToken }, transports: ["websocket"], reconnection: false });
  const second = connectSocket(base, { auth: { token: employerToken }, transports: ["websocket"], reconnection: false });
  const connected = socket => Promise.race([once(socket, "connect"), once(socket, "connect_error").then(([e]) => { throw e; })]);
  try {
    await Promise.all([connected(first), connected(second)]);
    const users = require("../dist/socket/onlineUsers").default;
    assert.equal(users.get(employer._id.toString()).size, 2);
    const serverSocket = sockets.sockets.sockets.get(first.id);
    const disconnected = once(serverSocket, "disconnect");
    first.disconnect(); await disconnected;
    assert.equal(users.get(employer._id.toString()).size, 1);
    const incoming = once(second, "new-message");
    const sent = await request("POST", "/messages/send", { receiverId: employer._id.toString(), content: "Hello employer" }, seekerToken);
    assert.equal(sent.status, 201);
    assert.equal(sent.body.data.status, "delivered");
    assert.equal((await incoming)[0].content, "Hello employer");
    const list = await request("GET", "/messages/conversations?limit=2", undefined, employerToken);
    assert.equal(list.status, 200);
    assert.equal(list.body.conversations[0].unreadCount, 1);
  } finally { first.disconnect(); second.disconnect(); }
});
test("revoked socket token is rejected", async () => {
  const revoked = token(employer); const claims = jwt.decode(revoked);
  await Revoked.create({ userId: employer._id, tokenId: claims.jti, expireAt: new Date(claims.exp * 1000) });
  const socket = connectSocket(base, { auth: { token: revoked }, transports: ["websocket"], reconnection: false });
  try { const [error] = await once(socket, "connect_error"); assert.match(error.message, /Invalid/); }
  finally { socket.disconnect(); }
});
test("offline messages remain sent and blank messages are rejected", async () => {
  const result = await request("POST", "/messages/send", { receiverId: otherEmployer._id.toString(), content: "Hello offline" }, seekerToken);
  assert.equal(result.status, 201); assert.equal(result.body.data.status, "sent");
  assert.equal((await request("POST", "/messages/send", { receiverId: otherEmployer._id.toString(), content: "   " }, seekerToken)).status, 400);
});
