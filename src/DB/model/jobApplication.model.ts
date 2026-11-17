import mongoose from "mongoose";

export enum ApplicationStatus {
  pending = "pending",
  reviewed = "reviewed",
  shortlisted = "shortlisted",
  rejected = "rejected",
  accepted = "accepted",
}

export interface IApplication {
  jobId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  //companyId: mongoose.Types.ObjectId;
  status: ApplicationStatus;
  resume: string;
  coverLetter?: string; //description of the applicant's qualifications and interest in the job
}

const applicationSchema = new mongoose.Schema<IApplication>(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  //  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: Object.values(ApplicationStatus),
      default: ApplicationStatus.pending,
    },
    resume: { type: String, required: true },
    coverLetter: { type: String },
  },
  {
    timestamps: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

applicationSchema.index({ jobId: 1, userId: 1 }, { unique: true }); // Ensure a user can only apply once to a specific job

const applicationModel =
  mongoose.models.Application ||
  mongoose.model<IApplication>("Application", applicationSchema);

export default applicationModel;