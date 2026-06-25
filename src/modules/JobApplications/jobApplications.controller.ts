import { Router } from "express";
import * as AV from "./jobApplications.validation";
import AS from "./jobApplications.service";
import { Validation } from "../../middleware/validation";
import { Authentication } from "../../middleware/Authentication";
import { authorization } from "../../middleware/authorization";
import { TokenType } from "../../utils/token";
import { RoleType } from "../../DB/model/user.model";
import { fileValidation, multerCloud } from "../../middleware/multer.cloud";

const applicationRouter = Router();
//======================== Apply for a job ========================
applicationRouter.post(
  "/apply/:jobId",
  Authentication(TokenType.access),
  authorization([RoleType.job_seeker]),
  multerCloud({ fileTypes: fileValidation.doc }).single("resume"),
  Validation(AV.applyJobSchema),
  AS.applyJob,
);
//======================== Get my applications ========================
applicationRouter.get(
  "/my-applications",
  Authentication(TokenType.access),
  authorization([RoleType.job_seeker]),
  Validation(AV.getMyApplicationsSchema),
  AS.getMyApplications,
);
//==================== get all application=================================
applicationRouter.get(
  "/all",
  Authentication(TokenType.access),
  authorization([RoleType.admin]),
  Validation(AV.getAllApplicationsSchema),
  AS.getAllApplications,

);
//======================== Get job applications (for employers) ========================
applicationRouter.get(
  "/job/:jobId",
  Authentication(TokenType.access),
  authorization([RoleType.employer, RoleType.admin]),
  Validation(AV.getJobApplicationsSchema),
  AS.getJobApplications,
);
//======================== Update application status (for employers) ========================
applicationRouter.put(
  "/:appId/status",
  Authentication(TokenType.access),
  authorization([RoleType.employer, RoleType.admin]),
  Validation(AV.updateApplicationStatusSchema),
  AS.updateApplicationStatus,
);
//======================== Withdraw application (for job seekers) ========================
applicationRouter.delete(
  "/:appId",
  Authentication(TokenType.access),
  authorization([RoleType.job_seeker]),
  Validation(AV.withdrawApplicationSchema),
  AS.withdrawApplication,
);
//======================== Get application statistics ========================
applicationRouter.get(
  "/stats",
  Authentication(TokenType.access),
  authorization([RoleType.job_seeker, RoleType.employer, RoleType.admin]),
  AS.getApplicationStats,
);

export default applicationRouter;
