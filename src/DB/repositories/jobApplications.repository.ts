import { DbRepository } from "./db.repository";
import { Model } from "mongoose";
import { HydratedDocument } from "mongoose";
import { AppError } from "../../utils/classError";
import { IApplication } from "../model/jobApplication .model";

export class JobApplicationsRepository extends DbRepository<IApplication>{
    constructor(protected readonly model:Model<IApplication>){
        super(model)
    }
    async createApplication(data :Partial<IApplication>) :Promise < HydratedDocument <IApplication>>{
        const Application : HydratedDocument<IApplication> = await this.create(data);
            if(!Application){
                throw new AppError("Failed to create Application",400);
            }
        return Application;
    }
}