import { NextFunction, Request, Response } from "express";
import jobModel, { Status } from "../../DB/model/job.model";
import { JobRepository } from "../../DB/repositories/job.repository";
import { AppError } from "../../utils/classError";
import { uploadFile } from "../../utils/s3.config";
import { JobApplicationsRepository } from "../../DB/repositories/jobApplications.repository";
import applicationModel, { ApplicationStatus, IApplication } from "../../DB/model/jobApplication .model";
import { ApplyJobSchemaType, GetAllApplicationsSchemaType, GetMyApplicationsSchemaType } from "./jobApplications.validation";
import { Types } from "mongoose";
import { RoleType } from "../../DB/model/user.model";
class ApplicationService {
  private _applicationModel = new JobApplicationsRepository(applicationModel);
  private _jobModel = new JobRepository(jobModel);

  //======================== Apply for a job ========================
 applyJob = async (req: Request, res: Response, next: NextFunction) => {
  const { jobId } = req.params;
  const { coverLetter }: ApplyJobSchemaType = req.body;
  const userId = req.user?._id;

  if (!req.file) {
    throw new AppError("Resume file is required", 400);
  }

  const job = await this._jobModel.findOne({
    _id: jobId,
    status: Status.active,
    deletedAt: { $exists: false },
  });

  if (!job) {
    throw new AppError("Job not found or no longer active", 404);
  }

  if (job.applicationDeadline && job.applicationDeadline < new Date()) {
    throw new AppError("Application deadline has passed", 400);
  }

  if (job.postedBy.toString() === userId?.toString()) {
    throw new AppError("You cannot apply for your own job", 400);
  }

  const resumeKey = await uploadFile({
    path: `applications/${userId}/${jobId}`,
    file: req.file,
    ACL: "private",
  });

 const application = await this._applicationModel.create({
  jobId: new Types.ObjectId(jobId),
  userId: new Types.ObjectId(userId!.toString()),
  //companyId: new Types.ObjectId(job.postedBy.toString()),
  resume: resumeKey,
  coverLetter,
} as Partial<IApplication>);

  await this._jobModel.updateOne(
    { _id: jobId },
    { $inc: { applicationsCount: 1 } }
  );

  return res.status(201).json({
    message: "Application submitted successfully",
    application,
  });
};
//======================== Get my applications ========================
getMyApplications = async (req: Request, res: Response, next: NextFunction) => {
  const { page = 1, limit = 10, status }: GetMyApplicationsSchemaType = req.query;

  const filter: any = {
    userId: req.user?._id,
  };

  if (status) filter.status = status;

  const result = await this._applicationModel.paginate({
    filter,
    query: { page: page as number, limit: limit as number },
    sort: { createdAt: -1 },
    populate: { path: "jobId", select: "title companySnapshot location employmentType" },
  });

  return res.status(200).json({
    message: "Applications retrieved successfully",
    pagination: {
      current_page: result.currentPage,
      total_pages: result.numberOfPages,
      total_count: result.countDocument,
      limit,
    },
    applications: result.docs,
  });
};
//======================== Get job applications (for employer) ========================
getJobApplications = async (req: Request, res: Response, next: NextFunction) => {
  const { jobId } = req.params;
  const { page = 1, limit = 10, status } = req.query as any;
  const job = await this._jobModel.findOne({ _id: jobId });

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  if (
    job.postedBy.toString() !== req.user?._id?.toString() &&
    req.user?.role !== RoleType.admin
  ) {
    throw new AppError("You are not authorized to view these applications", 403);
  }

  const filter: any = { jobId };
  if (status) filter.status = status;

  const result = await this._applicationModel.paginate({
    filter,
    query: { page: Number(page), limit: Number(limit) },
    sort: { createdAt: -1 },
    populate: { path: "userId", select: "firstName lastName email profileImage" },
  });

  return res.status(200).json({
    message: "Job applications retrieved successfully",
    pagination: {
      current_page: result.currentPage,
      total_pages: result.numberOfPages,
      total_count: result.countDocument,
      limit,
    },
    applications: result.docs,
  });
};
//======================== Update application status (for employer) ========================
updateApplicationStatus = async (req: Request, res: Response, next: NextFunction) => {
  const { appId } = req.params;
  const { status } = req.body;

  const application = await this._applicationModel.findOne({ _id: appId });

  if (!application) {
    throw new AppError("Application not found", 404);
  }

  const job = await this._jobModel.findOne({ _id: application.jobId });

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  if (
    job.postedBy.toString() !== req.user?._id?.toString() &&
    req.user?.role !== RoleType.admin
  ) {
    throw new AppError("You are not authorized to update this application", 403);
  }

  const updatedApplication = await this._applicationModel.findOneAndUpdate(
    { _id: appId },
    { $set: { status } },
    { new: true }
  );

  return res.status(200).json({
    message: "Application status updated successfully",
    application: updatedApplication,
  });
};
//======================== Withdraw application (for job seeker) ========================
withdrawApplication = async (req: Request, res: Response, next: NextFunction) => {
  const { appId } = req.params;
  const application = await this._applicationModel.findOne({
    _id: appId,
    userId: req.user?._id,
  });

  if (!application) {
    throw new AppError("Application not found", 404);
  }

  if (application.status !== ApplicationStatus.pending) {
    throw new AppError("Cannot withdraw application after it has been reviewed", 400);
  }

  await this._applicationModel.deleteOne({ _id: appId });

  await this._jobModel.updateOne(
    { _id: application.jobId },
    { $inc: { applicationsCount: -1 } }
  );

  return res.status(200).json({
    message: "Application withdrawn successfully",
  });
};
//======================== Get application statistics ========================
getApplicationStats = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const role = req.user?.role;
  if (role === RoleType.job_seeker) {
    const stats = await applicationModel.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const formattedStats = Object.values(ApplicationStatus).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<string, number>);

    stats.forEach((s) => {
      formattedStats[s._id] = s.count;
    });

    const total = Object.values(formattedStats).reduce((a, b) => a + b, 0);

    return res.status(200).json({
      message: "Application statistics retrieved successfully",
      stats: {
        total,
        ...formattedStats,
      },
    });
  }

  if (role === RoleType.employer || role === RoleType.admin) {
    const matchFilter = role === RoleType.employer 
      ? { companyId: userId } 
      : {};

    const stats = await applicationModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const formattedStats = Object.values(ApplicationStatus).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<string, number>);

    stats.forEach((s) => {
      formattedStats[s._id] = s.count;
    });

    const total = Object.values(formattedStats).reduce((a, b) => a + b, 0);

    const activeJobs = await jobModel.countDocuments({
      postedBy: userId,
      status: Status.active,
    });

    return res.status(200).json({
      message: "Application statistics retrieved successfully",
      stats: {
        total,
        activeJobs: role === RoleType.employer ? activeJobs : undefined,
        ...formattedStats,
      },
    });
  }
};
//==================== get all application=================================
getAllApplications = async (req: Request, res: Response, next: NextFunction) => {
  const { page = 1, limit = 10, status, jobId, userId }: GetAllApplicationsSchemaType = req.query;

  const filter: any = {};

  if (status) filter.status = status;
  if (jobId) filter.jobId = new Types.ObjectId(jobId);
  if (userId) filter.userId = new Types.ObjectId(userId);

  const result = await this._applicationModel.paginate({
    filter,
    query: { page: page as number, limit: limit as number },
    sort: { createdAt: -1 },
    populate: { path: "jobId", select: "title companySnapshot location employmentType" },
  });

  return res.status(200).json({
    message: "All applications retrieved successfully",
    pagination: {
      current_page: result.currentPage,
      total_pages: result.numberOfPages,
      total_count: result.countDocument,
      limit,
    },
    applications: result.docs,
  });
};
}

export default new ApplicationService();