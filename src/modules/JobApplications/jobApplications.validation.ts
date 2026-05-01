import { z } from "zod";
import { ApplicationStatus } from "../../DB/model/jobApplication .model";
//==================== applying to a job==================
export const applyJobSchema = {
  params: z.strictObject({
    jobId: z
      .string()
      .length(24, "Invalid job ID format")
      .regex(/^[0-9a-f]{24}$/, "Invalid job ID format"),
  }),
  body: z.strictObject({
    coverLetter: z.string().min(10).max(1000).trim().optional(),
  }),
};
//==================== get my applications==================
export const getMyApplicationsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
    status: z.enum(Object.values(ApplicationStatus) as [string, ...string[]]).optional(),
  }),
};
//==================== get job applications==================
export const getJobApplicationsSchema = {
  params: z.strictObject({
    jobId: z
      .string()
      .length(24, "Invalid job ID format")
      .regex(/^[0-9a-f]{24}$/, "Invalid job ID format"),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
    status: z.enum(Object.values(ApplicationStatus) as [string, ...string[]]).optional(),
  }),
};
//==================== update application status (for employers)==================
export const updateApplicationStatusSchema = {
  params: z.strictObject({
    appId: z
      .string()
      .length(24, "Invalid application ID format")
      .regex(/^[0-9a-f]{24}$/, "Invalid application ID format"),
  }),
  body: z.strictObject({
    status: z.enum(Object.values(ApplicationStatus) as [string, ...string[]]),
  }),
};
//==================== withdraw application (for job seekers)==================
export const withdrawApplicationSchema = {
  params: z.strictObject({
    appId: z
      .string()
      .length(24, "Invalid application ID format")
      .regex(/^[0-9a-f]{24}$/, "Invalid application ID format"),
  }),
};

export type WithdrawApplicationSchemaType = z.infer<typeof withdrawApplicationSchema.params>;
export type UpdateApplicationStatusSchemaType = {
  params: z.infer<typeof updateApplicationStatusSchema.params>;
  body: z.infer<typeof updateApplicationStatusSchema.body>;
};
export type GetJobApplicationsSchemaType = {
  params: z.infer<typeof getJobApplicationsSchema.params>;
  query: z.infer<typeof getJobApplicationsSchema.query>;
};
export type GetMyApplicationsSchemaType = z.infer<typeof getMyApplicationsSchema.query>;
export type ApplyJobSchemaType = z.infer<typeof applyJobSchema.body>;
