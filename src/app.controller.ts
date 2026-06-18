import { resolve } from "path";
import { config } from "dotenv";
config({ path: resolve("./config/.env") });
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { AppError } from "./utils/classError";
import userRouter from "./modules/user/user.controller";
import connectionDB from "./DB/connectionDB";
import JobRouter from "./modules/job/job.controller";
import JobApplicationsRouter from "./modules/JobApplications/jobApplications.controller";
import messageRouter from "./modules/message/message.controller";
import { createServer } from "http";
import { initSocket } from "./socket/socket";
import globalError from "./middleware/globalError";
const app: express.Application = express();
const port: string | number = process.env.PORT || 5000;
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  legacyHeaders: false, // Disable the `X-RateLimit -*` headers.
  message: {
    error: "Too many requests from this IP, please try again after 15 minutes",
  },
  statusCode: 429,
});
const bootstrap = async () => {

  app.use(express.json());
  app.use(cors());
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
  app.use(limiter);


  app.get("/", (req: Request, res: Response, next: NextFunction) => {
    return res.status(200).json({message: "Server is up and running... welcome to my Jopify app!",});
  });
  app.use("/users" , userRouter);
  app.use("/jobs" , JobRouter);
  app.use("/job-applications" , JobApplicationsRouter);
  app.use("/messages" , messageRouter);
  await connectionDB();
  // app.use("*", (req: Request, res: Response, next: NextFunction) => {
  //   throw new AppError(`Invalid Url ${req.originalUrl}`, 404);
  // });
  app.use("/{*any}", (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Invalid Url ${req.originalUrl}`, 404));
  });
  app.use(globalError);


 const httpServer = createServer(app);

 initSocket(httpServer);

 httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
 });

}
export default bootstrap;