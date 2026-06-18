import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/classError";

const globalError = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  return res.status(statusCode).json({
    status: "error",
    statusCode,
    message,
  });
};

export default globalError;