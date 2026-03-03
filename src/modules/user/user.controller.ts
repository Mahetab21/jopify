import { Router } from "express";
import  US from "./user.service";
import * as UV from "./user.validation";
import { Validation } from "../../middleware/validation";
import { Authentication } from "../../middleware/Authentication";
import { TokenType } from "../../utils/token";
import { fileValidation, multerCloud } from "../../middleware/multer.cloud";
const userRouter = Router();

userRouter.post("/signUp" ,Validation(UV.signUpSchema), US.signUp)
userRouter.post("/confirmEmail" ,Validation(UV.confirmEmailSchema), US.confirmEmail)
userRouter.post("/signIn", Validation(UV.signInSchema), US.signIn);
userRouter.post("/logInWithGmail", Validation(UV.logInWithGmailSchema), US.logInWithGmail);
userRouter.post("/logOut",Authentication(),Validation(UV.logOutSchema), US.logOut);
userRouter.patch("/forgetPassword",Validation(UV.forgetPasswordSchema), US.forgetPassword);
userRouter.patch("/resetPassword",Validation(UV.resetPasswordSchema), US.resetPassword);
userRouter.get("/getProfile", Authentication(), US.getProfile);
userRouter.put("/updateBasicInfo",
  Authentication(TokenType.access),
  Validation(UV.updateBasicInfoSchema),
  US.updateBasicInfo
);
userRouter.post("/addExperiance",
  Authentication(TokenType.access),
  Validation(UV.addExperianceSchema),
  US.addExperiance
);
userRouter.put("/updateExperiance/:experianceId",
  Authentication(TokenType.access),
  Validation(UV.updateExperianceSchema),
  US.updateExperiance
);
userRouter.delete("/deleteExperiance/:experianceId",
  Authentication(TokenType.access),
  Validation(UV.deleteExperianceSchema),
  US.deleteExperiance
);
userRouter.post("/addEducation",
  Authentication(TokenType.access),
  Validation(UV.addEducationSchema),
  US.addEducation
);
userRouter.put("/updateEducation/:educationId",
  Authentication(TokenType.access),
  Validation(UV.updateEducationSchema),
  US.updateEducation
);
userRouter.delete("/deleteEducation/:educationId",
  Authentication(TokenType.access),
  Validation(UV.deleteEducationSchema),
  US.deleteEducation
);
userRouter.post("/uploadResume",
  Authentication(TokenType.access),
  multerCloud({ fileTypes: fileValidation.doc }).single("resume"),
  US.uploadResume
)
userRouter.put("/updateSkills",
  Authentication(TokenType.access),
  Validation(UV.updateSkillsSchema),
  US.updateSkills
)
userRouter.get("/getSavedJobs",
  Authentication(TokenType.access),
  US.getSavedJobs
);
userRouter.post("/saveJob/:jobId",
  Authentication(TokenType.access),
  Validation(UV.saveJobSchema),
  US.saveJob
)
userRouter.delete("/removeSavedJob/:jobId",
  Authentication(TokenType.access),
  Validation(UV.removeSavedJobSchema),
  US.removeSavedJob
)
export default userRouter;