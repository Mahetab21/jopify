const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createJobSchema, updateJobSchema } = require("../dist/modules/job/job.validation");
const { updateExperianceSchema, updateEducationSchema } = require("../dist/modules/user/user.validation");

const job = {
  companySnapshot: { name: "Example Company" },
  title: "Backend Developer",
  description: "Build reliable recruitment APIs using TypeScript and MongoDB.",
  responsibilities: ["Build reliable APIs"], requirements: ["TypeScript experience"],
  location: "Cairo", employmentType: "full_time", experienceLevel: "entry_level",
  salaryRange: { min: "10000", max: "20000" }, skillsRequired: ["Node.js"],
  category: "Engineering", openings: "2", isRemote: "false",
};
test("multipart job fields preserve false and convert numeric values", () => {
  const parsed = createJobSchema.body.parse(job);
  assert.equal(parsed.isRemote, false);
  assert.equal(parsed.openings, 2);
  assert.equal(parsed.salaryRange.min, 10000);
  assert.equal(createJobSchema.body.safeParse({ ...job, openings: "" }).success, false);
  assert.equal(createJobSchema.body.safeParse({ ...job, isRemote: "invalid" }).success, false);
});
test("partial job edits do not reset remote status and empty updates fail", () => {
  assert.deepEqual(updateJobSchema.body.parse({ title: "Updated title" }), { title: "Updated title" });
  assert.equal(updateJobSchema.body.safeParse({}).success, false);
});
test("partial profile edits do not reset current experience or education", () => {
  assert.deepEqual(updateExperianceSchema.body.parse({ position: "Senior Developer" }), { position: "Senior Developer" });
  assert.deepEqual(updateEducationSchema.body.parse({ degree: "Bachelor" }), { degree: "Bachelor" });
});
