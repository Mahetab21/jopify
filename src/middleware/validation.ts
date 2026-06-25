import { Request, Response, NextFunction } from "express";
import z, { ZodType } from "zod";
import { AppError } from "./../utils/classError";
type ReqType = keyof Request;
type SchemaType = Partial<Record<ReqType, ZodType>>;

export const Validation = (schema: SchemaType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validationError: z.ZodError[] = [];
    for (const key of Object.keys(schema) as ReqType[]) {
      if (!schema[key]) continue;
      const result = schema[key].safeParse(req[key]);
      if (!result.success) {
        validationError.push(result.error);
      } else {
        const target = (req as any)[key];
        if (typeof target === "object" && target !== null) {
          Object.assign(target, result.data);
        } else {
          (req as any)[key] = result.data;
        }
      }
    }
    if (validationError.length) {
      const errors = validationError.flatMap((err) => err.issues);
      throw new AppError(JSON.stringify(errors), 400);
    }
    next();
  };
};