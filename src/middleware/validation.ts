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
        (req as any)[key] = result.data; // ← ده الحل، بيحدث الـ req بالـ data المحولة
      }
    }
    if (validationError.length) {
      const errors = validationError.flatMap((err) => err.issues);
      throw new AppError(JSON.stringify(errors), 400);
    }
    next();
  };
};