import { NextFunction, Request, Response } from "express";
import jobModel, { Status, ExperianceLevel, IJob } from "../../DB/model/job.model";
import { jobType, RoleType } from "../../DB/model/user.model";
import { JobRepository } from "../../DB/repositories/job.repository";
import { AppError } from "../../utils/classError";
import {
  CreateJobSchemaType,
  UpdateJobSchemaType,
  GetJobsQuerySchemaType,
  GetJobByIdSchemaType,
  DeleteJobSchemaType,
  GetMyJobsQuerySchemaType,
} from "./job.validation";
import { uploadFile } from "../../utils/s3.config";

class JobService {
  private _jobModel = new JobRepository(jobModel);
  constructor() {}

  // ================== Create Job ==================
 createJob = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new AppError("User not authenticated", 401);
  }

  const { companySnapshot, ...rest }: CreateJobSchemaType = req.body;

  let logoKey: string | undefined;
  if (req.file) {
    logoKey = await uploadFile({
      path: `companies/logos/${userId}`,
      file: req.file,
    });
  }

  const job = await this._jobModel.create({
    ...rest,
    companySnapshot: {
      name: companySnapshot.name,
      ...(logoKey && { logo: logoKey }),
    } as IJob["companySnapshot"],
    postedBy: userId,
    status: Status.active,
    applicationsCount: 0,
  } as Partial<IJob>);

  return res.status(201).json({
    message: "Job posted successfully",
    job,
  });
};
  // ================== Update Job ==================
  updateJob = async (req: Request, res: Response, next: NextFunction) => {
        const { jobId } = req.params;
        const updateData: UpdateJobSchemaType = req.body;

        // Verify job exists and user is the poster
        const job = await this._jobModel.findOne({ _id: jobId });

        if (!job) {
          throw new AppError("Job not found", 404);
        }

        if (job.postedBy.toString() !== req.user?._id?.toString() && 
               req.user?.role !== RoleType.admin) {
          throw new AppError("You are not authorized to update this job", 403);
        }

        // Update job
        const updatedJob = await this._jobModel.findOneAndUpdate(
          { _id: jobId },
          { $set: updateData },
          { new: true }
        );

        if (!updatedJob) {
          throw new AppError("Failed to update job", 500);
        }

        return res.status(200).json({
          message: "Job updated successfully",
          job: updatedJob,
        });
  };
  // ================== Delete Job (Soft Delete) ==================
  deleteJob = async (req: Request, res: Response, next: NextFunction) => {
        const { jobId }  = req.params as DeleteJobSchemaType;
        // Verify job exists and user is the poster
        const job = await this._jobModel.findOne({ _id: jobId });

        if (!job) {
          throw new AppError("Job not found", 404);
        }

        if (job.postedBy.toString() !== req.user?._id?.toString() && 
              req.user?.role !== RoleType.admin) {
          throw new AppError("You are not authorized to delete this job", 403);
        }

        // Soft delete - change status to closed
        const deletedJob = await this._jobModel.findOneAndUpdate(
          { _id: jobId },
           { $set: { 
            status: Status.closed,
            deletedAt: new Date(),
            deletedBy: req.user?._id 
            } 
          },
          { new: true }
        );

        if (!deletedJob) {
          throw new AppError("Failed to delete job", 500);
        }

        return res.status(200).json({
          message: "Job deleted successfully",
          job: deletedJob,
        });
  };
  // ================== Get All Jobs (with filters) ==================
  getAllJobs = async (req: Request, res: Response, next: NextFunction) => {
    const {
    page = 1, limit = 10, search, location,
    employmentType, experienceLevel, category,
    isRemote, minSalary, maxSalary, status,
    sortBy = "createdAt", sortOrder = "desc",
    }: GetJobsQuerySchemaType = req.query;

  const filter: any = {
    status: status || Status.active,
    deletedAt: { $exists: false },
  };

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { "companySnapshot.name": { $regex: search, $options: "i" } },
    ];
  }

  if (location) filter.location = { $regex: location, $options: "i" };
  if (employmentType) filter.employmentType = employmentType;
  if (experienceLevel) filter.experienceLevel = experienceLevel;
  if (category) filter.category = { $regex: category, $options: "i" };
  if (isRemote !== undefined) filter.isRemote = isRemote;

  if (minSalary || maxSalary) {
    filter.$and = [
      ...(minSalary ? [{ "salaryRange.min": { $gte: minSalary } }] : []),
      ...(maxSalary ? [{ "salaryRange.max": { $lte: maxSalary } }] : []),
    ];
  }

  const result = await this._jobModel.paginate({
    filter,
    query: { page: page as number, limit: limit as number },
    sort: { [sortBy as string]: sortOrder === "asc" ? 1 : -1 },
    populate: { path: "postedBy", select: "firstName lastName profileImage" },
  });

  return res.status(200).json({
    message: "Jobs retrieved successfully",
    pagination: {
      current_page: result.currentPage,
      total_pages: result.numberOfPages,
      total_count: result.countDocument,
      limit,
    },
    jobs: result.docs,
  });
  };
  // ================== Get Job By ID ==================
  getJobById = async (req: Request, res: Response, next: NextFunction) => {
  const { jobId } = req.params as GetJobByIdSchemaType;
  const job = await this._jobModel.findOne(
    { _id: jobId, deletedAt: { $exists: false } }
 );
  if (!job) {
    throw new AppError("Job not found", 404);
  }
  await job.populate("postedBy", "firstName lastName email profileImage");

  return res.status(200).json({
    message: "Job retrieved successfully",
    job,
  });
  };
  // ================== Get Jobs Posted by User ==================
  getMyJobs = async (req: Request, res: Response, next: NextFunction) => {
  const { page = 1, limit = 10, status }: GetMyJobsQuerySchemaType = req.query;
  const filter: any = { 
    postedBy: req.user?._id,
    deletedAt: { $exists: false },
  };
  if (status) filter.status = status;
  const result = await this._jobModel.paginate({
    filter,
    query: { page: page as number, limit: limit as number },
    sort: { createdAt: -1 },
  });

  return res.status(200).json({
    message: "Your jobs retrieved successfully",
    pagination: {
      current_page: result.currentPage,
      total_pages: result.numberOfPages,
      total_count: result.countDocument,
      limit,
    },
    jobs: result.docs,
  });
  };
 //================== Delete Job================================
  hardDeleteJob = async (req: Request, res: Response, next: NextFunction) => {
  const { jobId } = req.params;
  const job = await this._jobModel.findOne({ _id: jobId });

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  if (
    job.postedBy.toString() !== req.user?._id?.toString() &&
    req.user?.role !== RoleType.admin
  ) {
    throw new AppError("You are not authorized to delete this job", 403);
  }

  await this._jobModel.deleteOne({ _id: jobId });

  return res.status(200).json({
    message: "Job deleted successfully",
  });
 };
  // ================== Search Jobs by Skills ==================
  // searchJobsBySkills = async (req: Request, res: Response, next: NextFunction) => {
    //   try {
    //     const { skills } = req.query;

    //     if (!skills || typeof skills !== "string") {
    //       throw new AppError("Skills parameter is required", 400);
    //     }

    //     const skillsArray = skills.split(",").map((skill) => skill.trim());

    //     // Find jobs where at least one required skill matches
    //     const jobs = await jobModel
    //       .find({
    //         skillsRequired: { $in: skillsArray },
    //         status: "active",
    //       })
    //       .populate("postedBy", "firstName lastName profileImage")
    //       .sort({ createdAt: -1 });

    //     return res.status(200).json({
    //       message: "Jobs matching your skills retrieved successfully",
    //       count: jobs.length,
    //       jobs,
    //     });
    //   } catch (error) {
    //     next(error);
    //   }
    // };

    // ================== Get Trending Jobs ==================
    // getTrendingJobs = async (req: Request, res: Response, next: NextFunction) => {
    //   try {
    //     const { limit = 10 } = req.query;
    //     const limitNum = parseInt(limit as string) || 10;

    //     // Get jobs with most applications and views in last 7 days
    //     const sevenDaysAgo = new Date();
    //     sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    //     const jobs = await jobModel
    //       .find({
    //         status: "active",
    //         createdAt: { $gte: sevenDaysAgo },
    //       })
    //       .populate("postedBy", "firstName lastName profileImage")
    //       .sort({ applicationsCount: -1, views: -1 })
    //       .limit(limitNum);

    //     return res.status(200).json({
    //       message: "Trending jobs retrieved successfully",
    //       count: jobs.length,
    //       jobs,
    //     });
    //   } catch (error) {
    //     next(error);
    //   }
    // };
}

export default new JobService();
