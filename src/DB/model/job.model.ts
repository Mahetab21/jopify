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
    company: mongoose.Types.ObjectId;
    postedBy:mongoose.Types.ObjectId;
    description : string;
    responsibilities: string[];
    requirements: string[];
    preferredQualifications: string[];
    location : string;
    employmentType: jobType;
    experienceLevel: ExperianceLevel;
    salaryRange?: {
        min: number;
        max: number;
    };
    applicationDeadline?: Date;
    skillsRequired: string[];
    category: string;
    openings: number;
    status: Status;
    views: number;
    applicationsCount: number;
    isRemote: boolean;
}
const jobSchema = new mongoose.Schema<IJob>({
    title : { type:String, required:true },
    company: { type:mongoose.Schema.Types.ObjectId, ref:"Company", required:true },
    postedBy:{ type:mongoose.Schema.Types.ObjectId, ref:"User", required:true },
    description : { type:String ,required:true },
    responsibilities: { type:[String], required:true },
    requirements: { type:[String], required:true },
    preferredQualifications: { type:[String], required:true },
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
    views: { type:Number, default:0 },
    applicationsCount: { type:Number, default:0 },
    isRemote: { type:Boolean, required:true }
},{
    timestamps:true,
    strictQuery: true,
    toJSON:{virtuals:true},
    toObject:{virtuals:true}
})
const jobModel = mongoose.models.Job || mongoose.model<IJob>("Job",jobSchema);
export default jobModel;