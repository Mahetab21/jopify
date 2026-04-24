import { z } from "zod";
import { ExperianceLevel, Status } from "../../DB/model/job.model";
import { jobType } from "../../DB/model/user.model";

// ================== Create Job Schema ==================
export const createJobSchema = {
  body: z.strictObject({
    companySnapshot: z.object({
      name: z.string().min(2).max(100).trim(),
      logo: z.string().url().optional(),
    }),
    title: z.string().min(3).max(100).trim(),
    description: z.string().min(50).max(5000).trim(),
    responsibilities: z.array(z.string().min(5).max(500).trim()).min(1).max(10),
    requirements: z.array(z.string().min(5).max(500).trim()).min(1).max(10),
    preferredQualifications: z.array(z.string().min(5).max(500).trim()).max(10).optional(),
    location: z.string().min(2).max(100).trim(),
    employmentType: z.enum(Object.values(jobType) as [string, ...string[]]),
    experienceLevel: z.enum(Object.values(ExperianceLevel) as [string, ...string[]]),
    salaryRange: z.object({
      min: z.number().min(0).optional(),
      max: z.number().min(0).optional(),
    }).optional().refine(
      (data) => {
        if (!data) return true;
        if (data.min != null && data.max != null) return data.min <= data.max;
        return true;
      },
      { message: "Min salary must be <= max salary" }
    ),
    applicationDeadline: z.coerce.date().min(new Date()).optional(),
    skillsRequired: z.array(z.string().min(2).max(50).trim()).min(1).max(20),
    category: z.string().min(2).max(100).trim(),
    openings: z.number().int().min(1).max(100),
    isRemote: z.boolean().default(false),
  }),
};
// ================== Update Job Schema ==================
export const updateJobSchema = {
  params: z.strictObject({
    jobId: z
      .string()
      .length(24, "Invalid job ID format")
      .regex(/^[0-9a-f]{24}$/, "Invalid job ID format"),
  }),
  body: createJobSchema.body
  .omit({
    applicationDeadline: true, // prevent changing deadline to past date
  })
  .partial().refine(
    (data) => {
      return Object.keys(data).length > 0;
    },
    {
      message: "At least one field is required to update",
    },
  ),
};

// ================== Get Job By ID Schema ==================
export const getJobByIdSchema = {
  params: z.strictObject({
    jobId: z
      .string()
      .length(24, "Invalid job ID format")
      .regex(/^[0-9a-f]{24}$/, "Invalid job ID format"),
  }),
};

// ================== Delete Job Schema ==================
export const deleteJobSchema = {
  params: z.strictObject({
    jobId: z
      .string()
      .length(24, "Invalid job ID format")
      .regex(/^[0-9a-f]{24}$/, "Invalid job ID format"),
  }),
};

// ================== Get Jobs Query Schema ==================
export const getJobsQuerySchema = {
  query: z.object({
    page: z.coerce
      .number()
      .int()
      .min(1, "Page must be at least 1")
      .default(1)
      .optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1, "Limit must be at least 1")
      .max(100, "Limit must not exceed 100")
      .default(10)
      .optional(),
    search: z.string().trim().optional(),
    location: z.string().trim().optional(),
    employmentType: z
      .enum(Object.values(jobType) as [string, ...string[]])
      .optional(),
    experienceLevel: z
      .enum(Object.values(ExperianceLevel) as [string, ...string[]])
      .optional(),
    category: z.string().trim().optional(),
    isRemote: z
      .enum(["true", "false"])
      .transform((val) => val === "true")
      .optional(),
    minSalary: z.coerce.number().min(0).optional(),
    maxSalary: z.coerce.number().min(0).optional(),
    status: z.enum(Object.values(Status) as [string, ...string[]]).optional(),
    sortBy: z
      .enum(["createdAt", "salaryRange.max", "applicationsCount"])
      .default("createdAt")
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
  }),
};
// ================== Get My Jobs Query Schema ==================
export const getMyJobsQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
    status: z.enum(Object.values(Status) as [string, ...string[]]).optional(),
  }),
};

// ================== Type Exports ==================
export type CreateJobSchemaType = z.infer<typeof createJobSchema.body>;
export type UpdateJobSchemaType = z.infer<typeof updateJobSchema.body>;
export type GetJobByIdSchemaType = z.infer<typeof getJobByIdSchema.params>;
export type DeleteJobSchemaType = z.infer<typeof deleteJobSchema.params>;
export type GetJobsQuerySchemaType = z.infer<typeof getJobsQuerySchema.query>;
export type GetMyJobsQuerySchemaType = z.infer<typeof getMyJobsQuerySchema.query>;