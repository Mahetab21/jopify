import { Router } from "express";
import JS from "./job.service";
import * as JV from "./job.validation";
import { Validation } from "../../middleware/validation";
import { Authentication } from "../../middleware/Authentication";
import { authorization } from "../../middleware/authorization";
import { TokenType } from "../../utils/token";
import { RoleType } from "../../DB/model/user.model";
import { fileValidation, multerCloud } from "../../middleware/multer.cloud";

const JobRouter = Router();

// POST /jobs/create - Create job posting
JobRouter.post(
  "/create",
  Authentication(TokenType.access),
  authorization([RoleType.employer, RoleType.admin]),
  multerCloud({ fileTypes: fileValidation.image }).single("logo"),
  Validation(JV.createJobSchema),
  JS.createJob,
);
 // PUT /jobs/:jobId - Update job
JobRouter.put(
  "/:jobId",
  Authentication(TokenType.access),
  authorization([RoleType.employer, RoleType.admin]),
  Validation(JV.updateJobSchema),
  JS.updateJob,
);

// DELETE /jobs/:jobId - Delete job (soft delete)
JobRouter.delete(
  "/:jobId",
  Authentication(TokenType.access),
  authorization([RoleType.employer, RoleType.admin]),
  Validation(JV.deleteJobSchema),
  JS.deleteJob,
);
// GET /jobs - List all jobs (with filters)
JobRouter.get("/get-all", Validation(JV.getJobsQuerySchema), JS.getAllJobs);

// GET /jobs/my-jobs - Get jobs posted by authenticated user
JobRouter.get(
  "/my-jobs",
  Authentication(TokenType.access),
  authorization([RoleType.employer, RoleType.admin]),
  Validation(JV.getMyJobsQuerySchema),
  JS.getMyJobs,
);
// GET /jobs/:jobId - Get single job
JobRouter.get("/:jobId", Validation(JV.getJobByIdSchema), JS.getJobById);
// delete /jobs/:jobId - delete job (hard delete)
JobRouter.delete(
  "/hard-delete/:jobId",
  Authentication(TokenType.access),
  authorization([RoleType.employer, RoleType.admin]),
  Validation(JV.deleteJobSchema),
  JS.hardDeleteJob,
);
// // GET /jobs/search - Search jobs
// JobRouter.get("/search", Validation(JV.searchJobsSchema), JS.searchJobs);





export default JobRouter;
