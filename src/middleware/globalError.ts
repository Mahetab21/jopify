import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/classError";

const globalError = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  let statusCode = err instanceof AppError ? err.statusCode || 500 : 500;
  let message = err instanceof AppError ? err.message : "Internal Server Error";
  if (err?.code === 11000) { statusCode = 409; message = "Record already exists"; }
  else if (["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(err?.name)) {
    statusCode = 401; message = "Invalid or expired token";
  } else if (err?.name === "MulterError") {
    statusCode = 400; message = err.code === "LIMIT_FILE_SIZE" ? "File exceeds the 5 MB limit" : "Invalid upload";
  } else if (err?.name === "ValidationError" || err?.name === "CastError" || err?.type === "entity.parse.failed") {
    statusCode = 400; message = "Invalid request data";
  } else if (err?.type === "entity.too.large") {
    statusCode = 413; message = "Request body too large";
  }
  return res.status(statusCode).json({ status: "error", statusCode, message });
};
export default globalError;
