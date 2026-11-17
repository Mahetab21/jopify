import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";
import { AppError } from "../utils/classError";

type SchemaType = Partial<Record<"body" | "query" | "params", ZodType>>;
export const Validation = (schema: SchemaType) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const key of Object.keys(schema) as (keyof SchemaType)[]) {
      const result = schema[key]!.safeParse(req[key]);
      if (!result.success) throw new AppError(JSON.stringify(result.error.issues), 400);
      // Express 5 exposes query as a getter. Keep the parsed/coerced value
      // on this request, and discard fields stripped by the schema.
      Object.defineProperty(req, key, { value: result.data, writable: true, configurable: true, enumerable: true });
    }
    next();
  };
};
