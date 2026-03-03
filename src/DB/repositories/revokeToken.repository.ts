import { DbRepository } from "./db.repository";
import { IRevokeToken } from "../model/revokeToken.model";
import { Model } from "mongoose";
import { HydratedDocument } from "mongoose";
import { AppError } from "../../utils/classError";


export class RevokeTokenRepository extends DbRepository<IRevokeToken>{
    constructor(protected readonly model:Model<IRevokeToken>){
        super(model)
    }
    async createRevokeToken(data :Partial<IRevokeToken>) :Promise < HydratedDocument <IRevokeToken>>{
        const token : HydratedDocument<IRevokeToken> = await this.create(data);
        if(!token){
            throw new AppError("Failed to create revoke token",400);
        }
        return token;
    }
}