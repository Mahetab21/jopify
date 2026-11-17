const { test } = require("node:test");
const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");
const { sendEmail } = require("../dist/service/sendEmail");
const { emailTemplate } = require("../dist/service/email.temp");

test("email wrapper composes an OTP message without external delivery", async () => {
  process.env.EMAIL_USER = "sender@example.com";
  process.env.EMAIL_PASSWORD = "synthetic-test-password";
  const original = nodemailer.createTransport;
  const localTransport = original({ streamTransport: true, buffer: true, newline: "unix" });
  let result;
  nodemailer.createTransport = options => {
    assert.equal(options.service, "gmail");
    assert.equal(options.auth.user, "sender@example.com");
    return { sendMail: async message => { result = await localTransport.sendMail(message); } };
  };
  try {
    await sendEmail({ to: "recipient@example.com", subject: "Confirm your email", html: emailTemplate("123456", "Email confirmation") });
    assert.deepEqual(result.envelope.to, ["recipient@example.com"]);
    assert.equal(result.envelope.from, "sender@example.com");
    assert.match(result.message.toString(), /123456/);
    assert.match(result.message.toString(), /Subject: Confirm your email/);
  } finally {
    nodemailer.createTransport = original;
    localTransport.close();
  }
});
