import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/classError";
import {
  GetSignature,
  TokenType,
  decodedTokenAndFetchUser,
} from "../utils/token";

export const Authentication = (tokenType: TokenType = TokenType.access) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { authorization } = req.headers;
    const [prefix, token] = authorization?.split(" ") || [];
    if (!token || !prefix) {
      throw new AppError("Invalid Token", 401);
    }
    const signatures = await GetSignature(prefix, tokenType);
    if (!signatures) {
      throw new AppError("Invalid signature", 401);
    }
    const decoded = await decodedTokenAndFetchUser(token, signatures);
    if (!decoded) {
      throw new AppError("Invalid Token decoded", 401);
    }

    req.user = decoded?.user;
    req.decoded = decoded?.decoded;
    return next();
  };
};
