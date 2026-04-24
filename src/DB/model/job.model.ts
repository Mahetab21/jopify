import mongoose from "mongoose";
import { jobType } from "./user.model";
export enum ExperianceLevel {
    entry_level = "entry_level",
    mid_level = "mid_level",
    senior_level = "senior_level",
    lead_level = "lead_level",
    executive = "executive",
}
export enum Status {
    active = "active",
    closed = "closed",
    draft = "draft",
}
export interface IJob {
    title : string;
    companySnapshot: {
        name: string;
        logo?: string | undefined;
    }
    postedBy:mongoose.Types.ObjectId;
    description : string;
    responsibilities: string[];
    requirements: string[];
    preferredQualifications: string[];
    location : string;
    employmentType: jobType;
    experienceLevel: ExperianceLevel;
    salaryRange?: {
       min?: number;
       max?: number;
     };
    applicationDeadline?: Date;
    skillsRequired: string[];
    category: string; //filter 
    openings: number;
    status: Status;
    applicationsCount: number;
    isRemote: boolean;
    deletedAt?: Date;
    deletedBy?: mongoose.Types.ObjectId;


}
const jobSchema = new mongoose.Schema<IJob>({
    title : { type:String, required:true },
    companySnapshot: {
      name: { type: String, required: true },
      logo: { type: String },
    },
    postedBy:{ type:mongoose.Schema.Types.ObjectId, ref:"User", required:true },
    description : { type:String ,required:true },
    responsibilities: { type:[String], required:true },
    requirements: { type:[String], required:true },
    preferredQualifications: { type:[String] },
    location : { type:String, required:true },
    employmentType: { type: String, enum:Object.values(jobType), required:true },
    experienceLevel: { type:String, enum:Object.values(ExperianceLevel), required:true },
    salaryRange: {
        min: {type:Number},
        max: {type:Number}
    },
    applicationDeadline: { type:Date },
    skillsRequired: { type:[String], required:true },
    category: { type:String, required:true },
    openings: { type:Number, required:true },
    status: { type: String, enum:Object.values(Status), required:true },
    applicationsCount: { type:Number, default:0 },
    isRemote: { type:Boolean, default:false },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

},{
    timestamps:true,
    strictQuery: true,
    toJSON:{virtuals:true},
    toObject:{virtuals:true}
})
const jobModel = mongoose.models.Job || mongoose.model<IJob>("Job",jobSchema);
export default jobModel;