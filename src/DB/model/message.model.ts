import mongoose from "mongoose";

export enum MessageStatus {
  sent = "sent",
  delivered = "delivered",
  read = "read",
}

export interface IMessage {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  content: string;
  status: MessageStatus;
  isDeletedBySender: boolean;
  isDeletedByReceiver: boolean;
}

const messageSchema = new mongoose.Schema<IMessage>(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(MessageStatus),
      default: MessageStatus.sent,
    },
    isDeletedBySender: { type: Boolean, default: false },
    isDeletedByReceiver: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ createdAt: -1 });

const messageModel =
  mongoose.models.Message ||
  mongoose.model<IMessage>("Message", messageSchema);

export default messageModel;

// POST /messages/send   DONE
// GET /messages/conversations DONE
// GET /messages/conversation/:userId DONE
// PUT /messages/:messageId/read DONE
// DELETE /messages/:messageId DONE