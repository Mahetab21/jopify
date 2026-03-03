import revokeTokenModel from "../../DB/model/revokeToken.model";
import userModel, { ProviderType, RoleType } from "../../DB/model/user.model";
import { RevokeTokenRepository } from "../../DB/repositories/revokeToken.repository";
import { UserRepository } from "../../DB/repositories/user.repository";
import { NextFunction, Request, Response } from "express";
import {
  addEducationSchemaType,
  addExperianceSchemaType,
  confirmEmailSchemaType,
  flagType,
  forgetPasswordSchemaType,
  logInWithGmailSchemaType,
  logOutSchemaType,
  resetPasswordSchemaType,
  signInSchemaType,
  signUpSchemaType,
  updateBasicInfoSchemaType,
  updateEducationSchemaType,
  updateExperianceSchemaType,
  updateSkillsSchemaType,
} from "./user.validation";
import { AppError } from "../../utils/classError";
import { generateOtp } from "../../service/sendEmail";
import { eventEmitter } from "../../utils/events";
import { Compare, Hash } from "../../utils/hash";
import { v4 as uuidv4 } from "uuid";
import { GenerateToken } from "../../utils/token";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { deleteFile, uploadFile } from "../../utils/s3.config";
import { JobRepository } from "../../DB/repositories/job.repository";
import jobModel from "../../DB/model/job.model";

class UserService {
  private _userModel = new UserRepository(userModel);
  private _revokeToken = new RevokeTokenRepository(revokeTokenModel);
  private _jobModel = new JobRepository(jobModel);

  constructor() {}
  //================ signUp===================
  signUp = async (req: Request, res: Response, next: NextFunction) => {
    const {
      firstName,
      lastName,
      email,
      password,
      gender,
      age,
      role,
      phoneNumber,
      location,
    }: signUpSchemaType = req.body;
    const userExists = await this._userModel.findOne({ email });
    if (userExists) {
      throw new AppError("Email already exists", 409);
    }
    const otp = await generateOtp();
    const hashOtp = await Hash(String(otp));
    eventEmitter.emit("confirmEmail", { email, otp });
    const user = await this._userModel.create({
      firstName,
      lastName,
      email,
      otp: hashOtp,
      password,
      gender,
      age,
      role,
      phoneNumber,
      location,
    });
    return res.status(201).json({ message: "User created successfully", user });
  };
  //================ confirmEmail===================
  confirmEmail = async (req: Request, res: Response, next: NextFunction) => {
    const { email, otp }: confirmEmailSchemaType = req.body;
    const user = await this._userModel.findOne({
      email,
      confirmed: false,
    });
    if (!user) {
      throw new AppError("Invalid email or user already confirmed", 400);
    }
    if (!(await Compare(otp, user?.otp!))) {
      throw new AppError("Invalid OTP", 400);
    }
    await this._userModel.updateOne(
      { email: user?.email },
      { confirmed: true, $unset: { otp: "" } }
    );
    return res.status(200).json({ message: "Email confirmed successfully" });
  };
  //================ signIn===================
  signIn = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password }: signInSchemaType = req.body;
    const user = await this._userModel.findOne({
      email,
      confirmed: { $exists: true },
      provider: ProviderType.system,
    });
    if (!user) {
      throw new AppError("Invalid email or not confirmed yet", 400);
    }
    if (!(await Compare(password, user?.password!))) {
      throw new AppError("Invalid password", 400);
    }
    const jwtid = uuidv4();
    const access_token = await GenerateToken({
      payload: { id: user._id, email: user.email },
      signature:
        user.role === RoleType.user
          ? process.env.ACCESS_TOKEN_USER!
          : process.env.ACCESS_TOKEN_ADMIN!,
      options: { expiresIn: "1d", jwtid },
    });

    const refresh_token = await GenerateToken({
      payload: { id: user._id, email: user.email },
      signature:
        user.role === RoleType.user
          ? process.env.REFRESH_TOKEN_USER!
          : process.env.REFRESH_TOKEN_ADMIN!,
      options: { expiresIn: "1y", jwtid },
    });

    return res.status(200).json({
      message: "User signed in successfully",
      access_token,
      refresh_token,
      user,
    });
  };
  //================ logInWithGoogle===================
  logInWithGmail = async (req: Request, res: Response, next: NextFunction) => {
    const { idToken }: logInWithGmailSchemaType = req.body; //from frontend
    const client = new OAuth2Client();
    async function verify() {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.WEB_CLIENT_ID!,
      });
      const payload = ticket.getPayload();
      return payload;
    }

    const { email, email_verified, picture, name } =
      (await verify()) as TokenPayload;
    //check email
    let user = await this._userModel.findOne({ email });
    if (!user) {
      user = await this._userModel.create({
        email: email!,
        profileImage: picture!,
        confirmed: email_verified!,
        userName: name!,
        password: uuidv4(),
        provider: ProviderType.google,
      });
    }
    if (user?.provider === ProviderType.system) {
      throw new AppError("You can not log in with system account", 400);
    }
    const jwtid = uuidv4();
    const access_token = await GenerateToken({
      payload: { id: user._id, email: user.email },
      signature:
        user.role === RoleType.user
          ? process.env.ACCESS_TOKEN_USER!
          : process.env.ACCESS_TOKEN_ADMIN!,
      options: { expiresIn: "1d", jwtid },
    });

    const refresh_token = await GenerateToken({
      payload: { id: user._id, email: user.email },
      signature:
        user.role === RoleType.user
          ? process.env.REFRESH_TOKEN_USER!
          : process.env.REFRESH_TOKEN_ADMIN!,
      options: { expiresIn: "1y", jwtid },
    });
    return res.status(200).json({
      message: "User logged in with google successfully",
      access_token,
      refresh_token,
      user,
    });
  };
  //================= logout===================
  logOut = async (req: Request, res: Response, next: NextFunction) => {
    const { flag }: logOutSchemaType = req.body;
    if (flag === flagType?.all) {
      await this._userModel.updateOne(
        { _id: req.user?._id },
        { changeCredentials: new Date() }
      );
      return res
        .status(200)
        .json({ message: "User logged out from all devices successfully" });
    }
    await this._revokeToken.create({
      tokenId: req.decoded?.jti!,
      userId: req.user?._id!,
      expireAt: new Date(req.decoded?.exp! * 1000),
    });
    return res.status(200).json({ message: "User logged out successfully" });
  };
  //================= forgetPassword===================
  forgetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const { email }: forgetPasswordSchemaType = req.body;
    const user = await this._userModel.findOne({
      email,
      confirmed: { $exists: true },
    });
    if (!user) {
      throw new AppError("Invalid email or user not confirmed", 400);
    }
    const otp = await generateOtp();
    const hashOtp = await Hash(String(otp));
    eventEmitter.emit("forgetPassword", { email, otp });
    await this._userModel.updateOne({ email: user?.email }, { otp: hashOtp });
    return res.status(200).json({ message: "OTP sent to email successfully" });
  };
  //================= resetPassword===================
  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const { email, otp, password, cPassword }: resetPasswordSchemaType =
      req.body;
    const user = await this._userModel.findOne({
      email,
      otp: { $exists: true },
    });
    if (!user) {
      throw new AppError(
        "Invalid email or user not requested to change password",
        400
      );
    }
    if (!(await Compare(otp, user?.otp!))) {
      throw new AppError("Invalid OTP", 400);
    }
    const hash = await Hash(password);
    await this._userModel.updateOne(
      { email: user?.email },
      { password: hash, $unset: { otp: "" } }
    );
    return res.status(200).json({ message: "Password reset successfully" });
  };
  //================= getProfile===================
  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    const user = await this._userModel.findOne(
      { _id: req?.user?._id },
      "-password -otp"
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    await user.populate({
      path: "friends",
      select: "firstName lastName email profileImage",
    });

    // const groups = await this._chatModel.find({
    //   filter: {
    //     participants: { $in: [req?.user?._id] },
    //     group: { $exists: true },
    //   },
    // });

    return res
      .status(200)
      .json({ message: "User get profile successfully", user });
  };
  //================= updateProfile=================
  updateBasicInfo = async (req: Request, res: Response, next: NextFunction) => {
    const updateData: updateBasicInfoSchemaType = req.body;
    if (updateData.userName) {
      const existingUser = await this._userModel.findOne({
        userName: updateData.userName,
        _id: { $ne: req.user?._id },
      });
      if (existingUser) {
        throw new AppError("Username already exists", 409);
      }
    }
    const updatedUser = await this._userModel.findOneAndUpdate(
      { _id: req.user?._id },
      { $set: updateData },
      { new: true, select: "-password -otp" }
    );

    if (!updatedUser) {
      throw new AppError("User not found", 404);
    }

    return res.status(200).json({
      message: "Basic information updated successfully",
      user: updatedUser,
    });
  };
  //================= addExperiance=================
  addExperiance = async (req: Request, res: Response, next: NextFunction) => {
    const experianceData: addExperianceSchemaType = req.body;
    const user = await this._userModel.findOneAndUpdate(
      { _id: req.user?._id },
      { $push: { experience: experianceData } },
      { new: true, select: "-password -otp" }
    );
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return res.status(200).json({
      message: "Experience added successfully",
      user,
    });
  };
  //================= updateExperience=================
  updateExperiance = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { experianceId } = req.params;
    const experianceData: updateExperianceSchemaType = req.body;
    const user = await this._userModel.findOne({
      _id: req.user?._id,
      "experience._id": experianceId,
    });
    if (!user) {
      throw new AppError("User or Experience not found", 404);
    }
    const updatedUser = await this._userModel.findOneAndUpdate(
      {
        _id: req.user?._id,
        "experience._id": experianceId,
      },
      {
        $set: Object.keys(experianceData).reduce((acc, key) => {
          acc[`experience.$.${key}`] =
            experianceData[key as keyof typeof experianceData];
          return acc;
        }, {} as Record<string, any>),
      },
      { new: true, select: "-password -otp" }
    );

    return res.status(200).json({
      message: "Experience updated successfully",
      user: updatedUser,
    });
  };
  //================= deleteExperience=================
  deleteExperiance = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { experianceId } = req.params;
    const user = await this._userModel.findOneAndUpdate(
      {
        _id: req.user?._id,
        "experience._id": experianceId,
      },
      {
        $pull: { experience: { _id: experianceId } },
      },
      { new: true, select: "-password -otp" }
    );

    if (!user) {
      throw new AppError("User or experience not found", 404);
    }

    return res.status(200).json({
      message: "Experience deleted successfully",
      user,
    });
  };
  //================== addEducation=================
  addEducation = async (req: Request, res: Response, next: NextFunction) => {
    const educationData: addEducationSchemaType = req.body;
    const user = await this._userModel.findOneAndUpdate(
      { _id: req.user?._id },
      { $push: { education: educationData } },
      { new: true, select: "-password -otp" }
    );
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return res.status(200).json({
      message: "Education added successfully",
      user,
    });
  };
  //================== updateEducation=================
  updateEducation = async (req: Request, res: Response, next: NextFunction) => {
    const { educationId } = req.params;
    const educationData: updateEducationSchemaType = req.body;
    const user = await this._userModel.findOne({
      _id: req.user?._id,
      "education._id": educationId,
    });
    if (!user) {
      throw new AppError("User or Education not found", 404);
    }
    const updatedUser = await this._userModel.findOneAndUpdate(
      {
        _id: req.user?._id,
        "education._id": educationId,
      },
      {
        $set: Object.keys(educationData).reduce((acc, key) => {
          acc[`education.$.${key}`] =
            educationData[key as keyof typeof educationData];
          return acc;
        }, {} as Record<string, any>),
      },
      { new: true, select: "-password -otp" }
    );

    return res.status(200).json({
      message: "Education updated successfully",
      user: updatedUser,
    });
  };
  //================== deleteEducation=================
  deleteEducation = async (req: Request, res: Response, next: NextFunction) => {
    const { educationId } = req.params;
    const user = await this._userModel.findOneAndUpdate(
      {
        _id: req.user?._id,
        "education._id": educationId,
      },
      {
        $pull: { education: { _id: educationId } },
      },
      { new: true, select: "-password -otp" }
    );

    if (!user) {
      throw new AppError("User or education not found", 404);
    }

    return res.status(200).json({
      message: "Education deleted successfully",
      user,
    });
  };
  //=================== uploadResume===================
  uploadResume = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      throw new AppError("Resume file is required", 400);
    }

    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    const user = await this._userModel.findOne({ _id: req.user._id });
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Delete old resume from S3 if exists
    if (user.resume) {
      try {
        await deleteFile({ Key: user.resume });
      } catch (error) {
        console.error("Error deleting old resume:", error);
      }
    }

    // Upload new resume to S3
    const resumeKey = await uploadFile({
      path: `resumes/${req.user._id}`,
      file: req.file,
      ACL: "private",
    });

    const updatedUser = await this._userModel.findOneAndUpdate(
      { _id: req.user?._id },
      { $set: { resume: resumeKey } },
      { new: true, select: "-password -otp" }
    );

    return res.status(200).json({
      message: "Resume uploaded successfully",
      user: updatedUser,
    });
  };
  //================== updateSkills=================
  updateSkills = async (req: Request, res: Response, next: NextFunction) => {
  const { skills }: updateSkillsSchemaType = req.body;

  const updatedUser = await this._userModel.findOneAndUpdate(
    { _id: req.user?._id },
    { $set: { skills } },
    { new: true, select: "-password -otp" }
  );

  if (!updatedUser) {
    throw new AppError("User not found", 404);
  }

  return res.status(200).json({
    message: "Skills updated successfully",
    user: updatedUser,
  });
  };
  //================== getSaveJobs==================
  getSavedJobs = async (req: Request, res: Response, next: NextFunction) => {
    const user = await this._userModel.findOne(
      { _id: req.user?._id },
      "savedJobs"
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const savedJobs = await this._jobModel.find({
      filter: { _id: { $in: user.savedJobs || [] } },
      select: "-__v",
    });

    return res.status(200).json({
      message: "Saved jobs retrieved successfully",
      count: savedJobs.length,
      jobs: savedJobs,
    });
  };
  //================== saveJob==================
  saveJob = async (req: Request, res: Response, next: NextFunction) => {
    const { jobId } = req.params;
    const job = await this._jobModel.findOne({jobId});
    if (!job) {
      throw new AppError("Job not found", 404);
    }

    // Check if job is already saved
    const user = await this._userModel.findOne({
      _id: req.user?._id,
      savedJobs: jobId,
    });

    if (user) {
      throw new AppError("Job already saved", 400);
    }

    // Add job to saved jobs
    const updatedUser = await this._userModel.findOneAndUpdate(
      { _id: req.user?._id },
      { $addToSet: { savedJobs: jobId } },
      { new: true, select: "-password -otp" }
    );

    if (!updatedUser) {
      throw new AppError("User not found", 404);
    }

    return res.status(200).json({
      message: "Job saved successfully",
      user: updatedUser,
    });
  };
  //================== removeSavedJob==================
  removeSavedJob = async (req: Request, res: Response, next: NextFunction) => {
    const { jobId } = req.params;
    // Check if job is in saved jobs
    const user = await this._userModel.findOne({
      _id: req.user?._id,
      savedJobs: jobId,
    });

    if (!user) {
      throw new AppError("Job not found in saved jobs", 404);
    }

    // Remove job from saved jobs
    const updatedUser = await this._userModel.findOneAndUpdate(
      { _id: req.user?._id },
      { $pull: { savedJobs: jobId } },
      { new: true, select: "-password -otp" }
    );

    if (!updatedUser) {
      throw new AppError("User not found", 404);
    }

    return res.status(200).json({
      message: "Job removed from saved jobs successfully",
      user: updatedUser,
    });
  };
}

export default new UserService();
