import mongoose, { model, Types } from "mongoose";
import { Hash } from "../../utils/hash";
export enum RoleType {
    job_seeker = "job_seeker",
    employer = "employer",
    admin = "admin",
    user = "user",
}
export enum GenderType{
    male="male",
    female="female"
}
export enum jobType {
    full_time = "full_time",
    part_time = "part_time",
    remote = "remote",
    internship = "internship",
}
export enum ProviderType{
    google="google",
    system="system"
}
export interface IUser {
    firstName: string;
    lastName: string;
    userName?: string;
    email: string;
    password: string;
    gender: GenderType;
    phoneNumber?: string;
    age?: number;
    role: RoleType;
    otp?: string;
    tempProfileImage?: string;
    profileImage?: string;
    resume?: string;
    bio?: string;
    location?: string;
    skills?: string[];
    experience?: {
        _id: Types.ObjectId;
        company: string;
        position: string;
        startDate: Date;
        endDate?: Date;
        isCurrent: boolean;
        description?: string;
    }[];
    education?: {
        _id: Types.ObjectId;
        institution: string;
        degree: string;
        fieldOfStudy: string;
        startDate: Date;
        endDate?: Date;
        isCurrent: boolean;
        description?: string;
    }[];
    socialLinks?: {
        linkedIn?: string;
        github?: string;
        portfolio?: string;
    };
    jobTypePreferences?: jobType[];
    expectedSalary?: number;
    savedJobs?:Types.ObjectId[];
    provider: ProviderType;
    confirmed?: boolean;
    changeCredentials?:Date;
    deletedAt?:Date;
    deletedBy?:Types.ObjectId;
    restoredAt?:Date;
    restoredBy?:Types.ObjectId;
    friends?:Types.ObjectId[];
    blockedUsers?: Types.ObjectId[];
    isActive?:boolean;
    notificationsEnabled?:boolean;
}
const userSchema = new mongoose.Schema<IUser>({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    provider:{type: String,enum: ProviderType,default: ProviderType.system},
    password: {type: String,
        required: function(this:any){
        return this.provider === ProviderType.google ? false: true;
    }},
    age:{type: Number, min: 18, max: 60, required: function( this:any ){
        return this.provider === ProviderType.google ? false : true;
    }},
    gender:{type: String, enum: GenderType, required: function( this:any ){
        return this.provider === ProviderType.google ? false : true;
    }},
    phoneNumber: { type: String },
    location: { type: String },
    otp: { type: String },
    role: { type: String, enum: RoleType, default: RoleType.job_seeker },
    tempProfileImage: { type: String },
    profileImage: { type: String },
    resume: { type: String },
    bio: { type: String },
    skills: { type: [String] },
    experience: [{
        _id:{type: mongoose.Schema.Types.ObjectId,auto:true},
        company: { type: String, required: true },
        position: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date },
        isCurrent: { type: Boolean, required: true },
        description: { type: String },
    }],
    education:[{
        _id:{type: mongoose.Schema.Types.ObjectId,auto:true},
        institution: { type: String, required: true },
        degree: { type: String, required: true },
        fieldOfStudy: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date },
        isCurrent: { type: Boolean, required: true },
        description: { type: String },
    }],
    socialLinks: {
        linkedIn: { type: String },
        github: { type: String },
        portfolio: { type: String },
    },
    jobTypePreferences:{ type: [String], enum: Object.values(jobType) },
    expectedSalary: { type: Number },
    savedJobs: [{ type:mongoose.Schema.Types.ObjectId,ref:"Job"}],
    confirmed: { type: Boolean, default: false },
    changeCredentials:{type:Date},
    deletedAt:{type:Date},
    deletedBy:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
    restoredAt:{type:Date},
    restoredBy:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
    friends:{type:[mongoose.Schema.Types.ObjectId],ref:"User",default:[]},
    blockedUsers:{type:[mongoose.Schema.Types.ObjectId],ref:"User",default:[]},
    isActive:{type:Boolean,default:true},
    notificationsEnabled:{type:Boolean,default:true},
},{
    timestamps:true,
    strictQuery: true,
    toJSON:{virtuals:true},
    toObject:{virtuals:true}
})

userSchema.virtual("userName").set(function(value){
    const[firstName,lastName]= value.split(" ");
    this.set({firstName,lastName});
}).get(function(){
    return this.firstName+" "+this.lastName;
})

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await Hash(this.password);
  }
  next();
});
const userModel = mongoose.models.User || model<IUser>("User",userSchema);
export default userModel;