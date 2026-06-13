import { Router } from "express";
import MS from "./message.service";
import * as MV from "./message.validation";
import { Validation } from "../../middleware/validation";
import { Authentication } from "../../middleware/Authentication";
import { TokenType } from "../../utils/token";

const messageRouter = Router();
// ================== Send Message Route ==================
messageRouter.post(
  "/send",
  Authentication(TokenType.access),
  Validation(MV.sendMessageSchema),
  MS.sendMessage,
);
//================== Get Conversations Route ==================
messageRouter.get(
  "/conversations",
  Authentication(TokenType.access),
  Validation(MV.getConversationsSchema),
  MS.getConversations,
);
//=============================get conversations with user id =========================
messageRouter.get(
  "/conversation/:userId",
  Authentication(TokenType.access),
  Validation(MV.getConversationSchema),
  MS.getConversation,
);
//=============================mark messages as read =========================
messageRouter.put(
  "/:messageId/read",
  Authentication(TokenType.access),
  Validation(MV.markMessageReadSchema),
  MS.markMessageRead,
);
// PUT /messages/676f1234567890abcdef1234/read
// Headers:
//   Authorization: Bearer <access_token>
// Body: none
//=============================delete message  =========================
messageRouter.delete(
  "/:messageId",
  Authentication(TokenType.access),
  Validation(MV.deleteMessageSchema),
  MS.deleteMessage,
);
// DELETE /messages/676f1234567890abcdef1234
// Headers:
//   Authorization: Bearer <access_token>
// Body: none

export default messageRouter;