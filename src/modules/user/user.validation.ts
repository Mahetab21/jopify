import { z } from "zod";
import { GenderType, jobType, RoleType } from "../../DB/model/user.model";
export enum flagType {
  all = "all",
  current = "current",
}
export const signUpSchema = {
  body: z.strictObject({
      firstName: z.string().min(2).max(100).trim(),
      lastName: z.string().min(2).max(100).trim(),
      email: z.email(),
      password: z.string().regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
      cPassword: z.string(),
      age: z.number().min(18).max(60),
      location: z.string(),
      phoneNumber: z.string(),
      role: z.enum([RoleType.admin, RoleType.job_seeker , RoleType.employer]).default(RoleType.job_seeker),
      gender: z.enum([GenderType.female, GenderType.male]),
    }).required().superRefine((data, ctx) => {
      console.log(data, ctx);
      if (data.password !== data.cPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["cPassword"],
          message: "Password and confirm password must be the same",
        });
      }
    }),
};
export const confirmEmailSchema = {
  body: z.strictObject({
    email: z.email(),
    otp: z.string().regex(/^\d{6}$/).trim(),
    }).required(),
};
export const signInSchema = {
  body: z.strictObject({
      email: z.email(),
      password: z.string().regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
    }).required(),
};
export const logInWithGmailSchema = {
  body: z.strictObject({
      idToken: z.string(),
    }).required(),
};
export const logOutSchema = {
  body: z.strictObject({
      flag: z.enum(flagType),
    }).required(),
};
export const forgetPasswordSchema = {
  body: z.strictObject({
      email: z.email(),
    }).required(),
};
export const resetPasswordSchema = {
  body: confirmEmailSchema.body
    .extend({
      password: z
        .string()
        .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
      cPassword: z.string(),
    })
    .required()
    .superRefine((value, ctx) => {
      if (value.password !== value.cPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["cPassword"],
          message: "Password and confirm password must be the same",
        });
      }
    }),
};
export const updateBasicInfoSchema={
  body:z.strictObject({
    firstName: z.string().min(2).max(100).trim().optional(),
    lastName: z.string().min(2).max(100).trim().optional(),
    age: z.number().min(18).max(60).optional(),
    location: z.string().trim().max(100).optional(),
    phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
    bio: z.string().max(50).optional(),
    gender: z.enum([GenderType.female, GenderType.male]).optional(),
    userName:z.string().min(3).max(30).trim().optional(),
    expectedSalary:z.number().min(0).optional(),
    jobTypePreferences:z.array(z.enum([jobType.full_time, jobType.part_time, jobType.remote, jobType.internship])).optional(),
    notificationsEnabled:z.boolean().optional(),
    socialLinks: z.object({
      linkedIn: z.string().url().optional(),
      github: z.string().url().optional(),
      portfolio: z.string().url().optional(),
    }).optional(),

  }).refine((data) => {
    return Object.keys(data).length > 0
  },{
    message:"At least one field is required",

  })
}
//================== Experiance Schema ==================
export const experianceBodySchema = {
  body: z.strictObject({
    company: z.string().min(2).max(100).trim(),
    position: z.string().min(2).max(100).trim(),
    startDate: z.coerce.date(), 
    endDate: z.coerce.date().optional(),
    isCurrent: z.boolean().default(false),
    description: z.string().max(500).optional(),
  })
};
export const addExperianceSchema = {
  body : experianceBodySchema.body
}
export const updateExperianceSchema = {
  params : z.strictObject({
    experianceId: z.string().length(24),
  }),
  body : experianceBodySchema.body.partial().refine((data) => {
    return Object.keys(data).length > 0
  },{
    message:"At least one field is required",
  })
};
export const deleteExperianceSchema = {
  params : z.strictObject({
    experianceId: z.string().length(24),
  })
};
//================= Education Schema ==================
export const addEducationSchema = {
  body: z.strictObject({
    institution: z.string().min(2).max(150).trim(),
    degree: z.string().min(2).max(100).trim(),
    fieldOfStudy: z.string().min(2).max(100).trim(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    isCurrent: z.boolean().default(false),
    description: z.string().max(300).optional(),
  }),
};
export const updateEducationSchema = {
  params : z.strictObject({
    educationId: z.string().length(24),
    }),
    body: addEducationSchema.body.partial().refine((data) => {
      return Object.keys(data).length > 0
    },{
      message:"At least one field is required",
    })
};
export const deleteEducationSchema = {
  params: z.strictObject({
    educationId: z.string().length(24),
  })
};
export const saveJobSchema = {
  params: z.strictObject({
    jobId: z.string().length(24),
  }),
};
export const removeSavedJobSchema = {
  params: z.strictObject({
    jobId: z.string().length(24),
  }),
};
export type signUpSchemaType = z.infer<typeof signUpSchema.body>;
export type confirmEmailSchemaType = z.infer<typeof confirmEmailSchema.body>;
export type signInSchemaType = z.infer<typeof signInSchema.body>;
export type logInWithGmailSchemaType = z.infer<typeof logInWithGmailSchema.body>;
export type logOutSchemaType = z.infer<typeof logOutSchema.body>;
export type forgetPasswordSchemaType = z.infer<typeof forgetPasswordSchema.body>;
export type resetPasswordSchemaType = z.infer<typeof resetPasswordSchema.body>;
export type updateBasicInfoSchemaType=z.infer<typeof updateBasicInfoSchema.body>;
export type addExperianceSchemaType=z.infer<typeof addExperianceSchema.body>;
export type updateExperianceSchemaType={
  params:z.infer<typeof updateExperianceSchema.params>,
  body:z.infer<typeof updateExperianceSchema.body>
}
export const updateSkillsSchema = {
  body: z.strictObject({
    skills: z.array(z.string().min(1).max(50).trim()).min(1).max(20),
  }).required(),
};
export type deleteExperianceSchemaType=z.infer<typeof deleteExperianceSchema.params>;
export type addEducationSchemaType=z.infer<typeof addEducationSchema.body>;
export type updateEducationSchemaType={
  params:z.infer<typeof updateEducationSchema.params>,
  body:z.infer<typeof updateEducationSchema.body>
}
export type deleteEducationSchemaType=z.infer<typeof deleteEducationSchema.params>;
export type updateSkillsSchemaType=z.infer<typeof updateSkillsSchema.body>;
export type saveJobSchemaType=z.infer<typeof saveJobSchema.params>;
export type removeSavedJobSchemaType=z.infer<typeof removeSavedJobSchema.params>;