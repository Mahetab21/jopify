import {
  Model, 
  HydratedDocument,
  ProjectionType,
  QueryOptions,
  RootFilterQuery,
  UpdateQuery,
  UpdateWriteOpResult,
  DeleteResult,
  Types,
} from 'mongoose';
import { GenderType, jobType } from '../model/user.model';

export abstract class DbRepository < TDocument > {
  constructor(protected readonly model: Model<TDocument>) {}
  async create(data: Partial<TDocument>): Promise<HydratedDocument<TDocument>> {
    return this.model.create(data);
  }
  async findOne(
    filter: RootFilterQuery<TDocument>,
    select?: ProjectionType<TDocument>,
    options?: QueryOptions<TDocument>,
  ): Promise<HydratedDocument<TDocument> | null> {
    return this.model.findOne(filter, select, options);
  }
  async find({
    filter,
    select,
    options,
  }: {
    filter: RootFilterQuery<TDocument>;
    select?: ProjectionType<TDocument>;
    options?: QueryOptions<TDocument>;
  }): Promise<HydratedDocument<TDocument>[]> {
    return this.model.find(filter, select, options);
  }

  async updateOne(
    filter: RootFilterQuery<TDocument>,
    updated: UpdateQuery<TDocument>,
  ): Promise<UpdateWriteOpResult> {
    return await this.model.updateOne(filter, updated);
  }
  async findOneAndUpdate(
      filter:RootFilterQuery<TDocument>,
      updated:UpdateQuery<TDocument>,
      options:QueryOptions<TDocument>| null = {new:true}
    ): Promise<HydratedDocument<TDocument> | null>{
        return await this.model.findOneAndUpdate(filter,updated,options)
    }
  async deleteOne(filter: RootFilterQuery<TDocument>): Promise<DeleteResult> {
    return await this.model.deleteOne(filter);
  }
  async paginate({
    filter,
    query,
    projection,
    options,
  }: {
    filter: RootFilterQuery<TDocument>;
    query: { page: number; limit: number };
    projection?: ProjectionType<TDocument>;
    options?: QueryOptions<TDocument>;
  }) {
    let { page, limit = 2 } = query;

    if (page < 0) page = 1;
    page = page * 1 || 1;
    const skip = (page - 1) * limit;
    const finalOptions = {
      ...options,
      skip,
      limit,
    };
    const count = await this.model.countDocuments({
      deletedAt: { $exists: false },
    });
    const numberOfPages = Math.ceil(count / limit);
    const docs = await this.model.find(filter, projection, finalOptions);
    return { docs, currentPage: page, countDocument: count, numberOfPages };
  }
  async findOneAndDelete(
    filter: RootFilterQuery<TDocument>,
    options?: QueryOptions<TDocument>,
  ): Promise<HydratedDocument<TDocument> | null> {
    return await this.model.findOneAndDelete(filter, options);
  }
  async deleteMany(
    filter: RootFilterQuery<TDocument>,
  ): Promise<{ deletedCount?: number }> {
    return await this.model.deleteMany(filter);
  }
  async findById(
    id: string,
    select?: ProjectionType<TDocument>,
    options?: QueryOptions<TDocument>,
  ): Promise<HydratedDocument<TDocument> | null> {
    return await this.model.findById(id, select, options);
  }
}
