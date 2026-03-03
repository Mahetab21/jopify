import { DbRepository } from "./db.repository";
import { Model } from "mongoose";
import { HydratedDocument } from "mongoose";
import { AppError } from "../../utils/classError";
import { IJob } from "../model/job.model";

export class JobRepository extends DbRepository<IJob>{
    constructor(protected readonly model:Model<IJob>){
        super(model)
    }
    async createJob(data :Partial<IJob>) :Promise < HydratedDocument <IJob>>{
        const Job : HydratedDocument<IJob> = await this.create(data);
            if(!Job){
                throw new AppError("Failed to create Job",400);
            }
        return Job;
    }
}