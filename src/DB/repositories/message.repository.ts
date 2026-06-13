import { DbRepository } from "./db.repository";
import { Model } from "mongoose";
import { IMessage } from "../model/message.model";
import { Types } from "mongoose";

export class MessageRepository extends DbRepository<IMessage> {
  constructor(protected readonly model: Model<IMessage>) {
    super(model);
  }

  async findConversation({
    myId,
    otherId,
    skip,
    limit,
  }: {
    myId: Types.ObjectId;
    otherId: Types.ObjectId;
    skip: number;
    limit: number;
  }) {
    return this.model
      .find({
        $or: [
          { senderId: myId, receiverId: otherId, isDeletedBySender: false },
          { senderId: otherId, receiverId: myId, isDeletedByReceiver: false },
        ],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("senderId", "firstName lastName profileImage")
      .populate("receiverId", "firstName lastName profileImage")
      .lean();
  }

  async markAsRead(senderId: Types.ObjectId, receiverId: Types.ObjectId) {
    return this.model.updateMany(
      { senderId, receiverId, status: { $ne: "read" } },
      { $set: { status: "read" } }
    );
  }

  async countConversation(myId: Types.ObjectId, otherId: Types.ObjectId) {
    return this.model.countDocuments({
      $or: [
        { senderId: myId, receiverId: otherId, isDeletedBySender: false },
        { senderId: otherId, receiverId: myId, isDeletedByReceiver: false },
      ],
    });
  }
}