import { NextFunction, Request, Response } from "express";
import userModel from "../../DB/model/user.model";
import {  MessageRepository } from "../../DB/repositories/message.repository";
import { UserRepository } from "../../DB/repositories/user.repository";
import { AppError } from "../../utils/classError";
import { GetConversationsSchemaType, SendMessageSchemaType } from "./message.validation";
import { Types } from "mongoose";
import messageModel, { IMessage, MessageStatus } from "../../DB/model/message.model";
import { getIO } from "../../socket/socketInstance";
import onlineUsers from "../../socket/onlineUsers";
class MessageService {
  private _messageModel = new MessageRepository(messageModel);
  private _userModel = new UserRepository(userModel);
 
 //=============================send messsaga =================================== 
  sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    const { receiverId, content }: SendMessageSchemaType = req.body;
    const senderId = req.user?._id;
    //prevent sending message to self 
    if (senderId?.toString() === receiverId) {
      throw new AppError("You cannot send a message to yourself", 400);
    }
    //confirm receiver exists
    const receiver = await this._userModel.findOne({ _id: receiverId });
    if (!receiver) {
      throw new AppError("Receiver not found", 404);
    }
    //check if sender is blocked by receiver
    if (receiver.blockedUsers?.some((id) => id.toString() === senderId?.toString())) {
      throw new AppError("You cannot send a message to this user", 400);
    }

    const message = await this._messageModel.create({
      senderId: new Types.ObjectId(senderId!.toString()),
      receiverId: new Types.ObjectId(receiverId),
      content,
    } as Partial<IMessage>);
    //populate sender and receiver details
    await message.populate([
      { path: "senderId", select: "firstName lastName profileImage" },
      { path: "receiverId", select: "firstName lastName profileImage" },
    ]);


  const io = getIO();
  const receiverSocketId = onlineUsers.get(receiverId);
  if (receiverSocketId) {
  io.to(receiverSocketId).emit("new-message", message);
   }
  await this._messageModel.findOneAndUpdate(
    { _id: message._id },
    { $set: { status: MessageStatus.delivered } }
  );

  return res.status(201).json({
      message: "Message sent successfully",
      data: message,
    });
  };
 //=============================get conversations ===================================
  getConversations = async (req: Request, res: Response, next: NextFunction) => {
  const { page = 1, limit = 10 }: GetConversationsSchemaType = req.query;
  const userId = new Types.ObjectId(req.user?._id!.toString());

  const skip = ((page as number) - 1) * (limit as number);

  const conversations = await messageModel.aggregate([
    {
      // the user is either sender or receiver and the message is not deleted for them
      $match: {
        $or: [{ senderId: userId }, { receiverId: userId }],
        $and: [
          {
            $or: [
              { senderId: userId, isDeletedBySender: false },
              { receiverId: userId, isDeletedByReceiver: false },
            ],
          },
        ],
      },
    },
    {
        // to add field in result (otheruserid)
      $addFields: {
        otherUserId: {
          $cond: {
            if: { $eq: ["$senderId", userId] },
            then: "$receiverId",
            else: "$senderId",
          },
        },
      },
    },
    {
      // group by the another person and get the last message and count of unread messages
      $group: {
        _id: "$otherUserId",
        lastMessage: { $last: "$$ROOT" },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$receiverId", userId] },
                  { $eq: ["$status", "sent"] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { "lastMessage.createdAt": -1 } },
    { $skip: skip },
    { $limit: limit as number },
    {
      // populate to get the details of another person in conversation
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "otherUser",
        pipeline: [
          { $project: { firstName: 1, lastName: 1, profileImage: 1, isActive: 1 } },
        ],
      },
    },
    //unwind to convert the otherUser array to object
    { $unwind: "$otherUser" },
    {
      $project: {
        _id: 0,
        otherUser: 1,
        lastMessage: {
          content: 1,
          status: 1,
          createdAt: 1,
          senderId: 1,
        },
        unreadCount: 1,
      },
    },
  ]);

  // count total conversations
  const total = await messageModel.aggregate([
    {
      $match: {
        $or: [{ senderId: userId }, { receiverId: userId }],
      },
    },
    {
      $addFields: {
        otherUserId: {
          $cond: {
            if: { $eq: ["$senderId", userId] },
            then: "$receiverId",
            else: "$senderId",
          },
        },
      },
    },
    { $group: { _id: "$otherUserId" } },
    { $count: "total" },
  ]);

  const totalCount = total[0]?.total || 0;

  return res.status(200).json({
    message: "Conversations retrieved successfully",
    pagination: {
      current_page: page,
      total_pages: Math.ceil(totalCount / (limit as number)),
      total_count: totalCount,
      limit,
    },
    conversations,
  });
 };
 //=============================get conversation with user id =========================
  getConversation = async (req: Request, res: Response, next: NextFunction) => {
  const { userId: otherUserId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const myId = new Types.ObjectId(req.user?._id!.toString());
  const otherId = new Types.ObjectId(otherUserId);

  const otherUser = await this._userModel.findOne(
    { _id: otherId },
    "firstName lastName profileImage isActive"
  );

  if (!otherUser) {
    throw new AppError("User not found", 404);
  }

  const skip = ((page as number) - 1) * (limit as number);

  const [total, messages] = await Promise.all([
    this._messageModel.countConversation(myId, otherId),
    this._messageModel.findConversation({ myId, otherId, skip, limit: limit as number }),
    this._messageModel.markAsRead(otherId, myId),
  ]);

  return res.status(200).json({
    message: "Conversation retrieved successfully",
    pagination: {
      current_page: page,
      total_pages: Math.ceil((total as number) / (limit as number)),
      total_count: total,
      limit,
    },
    otherUser: {
    ...otherUser.toObject(),
    isOnline: onlineUsers.has(otherUser._id.toString()), 
  },
    messages: (messages as any[]).reverse(),
  });
  };
 //=============================mark messages as read =========================
 markMessageRead = async (req: Request, res: Response, next: NextFunction) => {
  const { messageId } = req.params;
  const userId = req.user?._id;

  const message = await this._messageModel.findOne({ _id: messageId });

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  // the recever who can only make read
  if (message.receiverId.toString() !== userId?.toString()) {
    throw new AppError("You are not authorized to mark this message as read", 403);
  }

  //if it aleady read return message with status 200
  if (message.status === MessageStatus.read) {
    return res.status(200).json({
      message: "Message already marked as read",
      data: message,
    });
  }

  const updatedMessage = await this._messageModel.findOneAndUpdate(
    { _id: messageId },
    { $set: { status: MessageStatus.read } },
    { new: true }
  );
  const io = getIO();
  const senderSocketId = onlineUsers.get(message.senderId.toString());
 if (senderSocketId) {
  io.to(senderSocketId).emit("message-seen", {
    messageId,
    by: userId,
  });
 }

  return res.status(200).json({
    message: "Message marked as read successfully",
    data: updatedMessage,
  });
};
//=============================delete message =========================
deleteMessage = async (req: Request, res: Response, next: NextFunction) => {
  const { messageId } = req.params;
  const userId = req.user?._id;

  const message = await this._messageModel.findOne({ _id: messageId });

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  //ensure that the user is either sender or receiver of the message
  const isSender = message.senderId.toString() === userId?.toString();
  const isReceiver = message.receiverId.toString() === userId?.toString();

  if (!isSender && !isReceiver) {
    throw new AppError("You are not authorized to delete this message", 403);
  }
   
  if (isSender) {
    await this._messageModel.findOneAndUpdate(
      { _id: messageId },
      { $set: { isDeletedBySender: true } },
    );
  }

  if (isReceiver) {
    await this._messageModel.findOneAndUpdate(
      { _id: messageId },
      { $set: { isDeletedByReceiver: true } },
    );
  }

  // لو الاتنين حذفوا - امسح من الـ database خالص
  const updatedMessage = await this._messageModel.findOne({ _id: messageId });
  if (updatedMessage?.isDeletedBySender && updatedMessage?.isDeletedByReceiver) {
    await this._messageModel.deleteOne({ _id: messageId });
  }

  return res.status(200).json({
    message: "Message deleted successfully",
  });
};

}

export default new MessageService();