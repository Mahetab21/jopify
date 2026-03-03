import jwt, { JwtPayload } from "jsonwebtoken";
import { UserRepository } from "../DB/repositories/user.repository";
import userModel from "../DB/model/user.model";
import { AppError } from "./classError";
import RevokeTokenModel from "../DB/model/revokeToken.model";
import { RevokeTokenRepository } from "../DB/repositories/revokeToken.repository";
export enum TokenType {
  access = "access",
  refresh = "refresh",
}
const _userModel = new UserRepository(userModel);
const _revokeToken = new RevokeTokenRepository(RevokeTokenModel as any);

export const GenerateToken = async ({
  payload,
  signature,
  options,
}: {
  payload: object;
  signature: string;
  options?: jwt.SignOptions;
}): Promise<string> => {
  return jwt.sign(payload, signature, options as jwt.SignOptions);
};
export const VerifyToken = async ({
  token,
  signature,
}: {
  token: string;
  signature: string;
}): Promise<JwtPayload> => {
  return jwt.verify(token, signature) as JwtPayload;
};

export const GetSignature = async (
  prefix: string,
  tokenType: TokenType = TokenType.access
): Promise<{ user: string; admin: string } | null> => {
  if (tokenType === TokenType.access) {
    if (
      prefix === process.env.BEARER_USER ||
      prefix === process.env.BEARER_ADMIN
    ) {
      // Return both signatures to try
      return {
        user: process.env.ACCESS_TOKEN_USER!,
        admin: process.env.ACCESS_TOKEN_ADMIN!,
      };
    } else {
      return null;
    }
  } else if (tokenType === TokenType.refresh) {
    if (
      prefix === process.env.BEARER_USER ||
      prefix === process.env.BEARER_ADMIN
    ) {
      // Return both signatures to try
      return {
        user: process.env.REFRESH_TOKEN_USER!,
        admin: process.env.REFRESH_TOKEN_ADMIN!,
      };
    } else {
      return null;
    }
  }
  return null;
};

export const decodedTokenAndFetchUser = async (
  token: string,
  signatures: { user: string; admin: string }
) => {
  let decoded;
  let lastError;

  // Try to verify with user signature first, then admin signature
  for (const sig of [signatures.user, signatures.admin]) {
    if (!sig) continue;
    try {
      decoded = await VerifyToken({ token, signature: sig });
      break; // If successful, exit loop
    } catch (err) {
      lastError = err;
      continue; // Try next signature
    }
  }

  if (!decoded) {
    throw lastError || new AppError("Invalid Token", 400);
  }
  const user = await _userModel.findOne({ email: decoded.email });
  if (!user) {
    throw new AppError("User not found", 404);
  }
  if (!user?.confirmed) {
    throw new AppError("Please confirm your email", 400);
  }
  if (await _revokeToken.findOne({ tokenId: decoded?.jti })) {
    throw new AppError("Token has been revoked", 401);
  }
  if (user?.changeCredentials?.getTime()! > decoded.iat! * 1000) {
    throw new AppError("token has been revoked", 401);
  }
  return { decoded, user };
};
