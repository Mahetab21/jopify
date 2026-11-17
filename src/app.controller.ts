import "./config/environment";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { createServer } from "node:http";
import { AppError } from "./utils/classError";
import userRouter from "./modules/user/user.controller";
import connectionDB from "./DB/connectionDB";
import JobRouter from "./modules/job/job.controller";
import JobApplicationsRouter from "./modules/JobApplications/jobApplications.controller";
import messageRouter from "./modules/message/message.controller";
import { initSocket } from "./socket/socket";
import globalError from "./middleware/globalError";
import { allowedOrigins, validateEnvironment } from "./config/environment";

export const createApp = () => {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: allowedOrigins() }));
  app.use(express.json({ limit: "100kb" }));
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests; try again after 15 minutes" },
  }));
  app.get("/", (_req, res) => res.json({ message: "Jobify API is running" }));
  app.use("/users", userRouter);
  app.use("/jobs", JobRouter);
  app.use("/job-applications", JobApplicationsRouter);
  app.use("/messages", messageRouter);
  app.use((req, _res, next) => next(new AppError(`Invalid URL ${req.originalUrl}`, 404)));
  app.use(globalError);
  return app;
};

const bootstrap = async () => {
  validateEnvironment();
  await connectionDB();
  const httpServer = createServer(createApp());
  initSocket(httpServer);
  const port = Number(process.env.PORT || 5000);
  httpServer.listen(port, () => console.log(`Jobify API listening on port ${port}`));
  return httpServer;
};
export default bootstrap;
