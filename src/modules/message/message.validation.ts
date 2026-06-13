import { z } from "zod";
// ================== Send Message Schema ==================
export const sendMessageSchema = {
  body: z.strictObject({
    receiverId: z
      .string()
      .length(24, "Invalid user ID format")
      .regex(/^[0-9a-f]{24}$/, "Invalid user ID format"),
    content: z.string().min(1, "Message cannot be empty").max(1000).trim(),
  }),
};
//================== Get Conversations Schema ==================
export const getConversationsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  }),
};
//=============================get conversations with user id =========================
export const getConversationSchema = {
  params: z.strictObject({
    userId: z
      .string()
      .length(24, "Invalid user ID format")
      .regex(/^[0-9a-f]{24}$/, "Invalid user ID format"),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  }),
};
//=============================mark message as read =========================
export const markMessageReadSchema = {
  params: z.strictObject({
    messageId: z
      .string()
      .length(24, "Invalid message ID format")
      .regex(/^[0-9a-f]{24}$/, "Invalid message ID format"),
  }),
};
//=============================delete message  =========================
export const deleteMessageSchema = {
  params: z.strictObject({
    messageId: z
      .string()
      .length(24, "Invalid message ID format")
      .regex(/^[0-9a-f]{24}$/, "Invalid message ID format"),
  }),
};

export type DeleteMessageSchemaType = z.infer<typeof deleteMessageSchema.params>;
export type MarkMessageReadSchemaType = z.infer<typeof markMessageReadSchema.params>;
export type GetConversationSchemaType = {
  params: z.infer<typeof getConversationSchema.params>;
  query: z.infer<typeof getConversationSchema.query>;
};
export type GetConversationsSchemaType = z.infer<typeof getConversationsSchema.query>;
export type SendMessageSchemaType = z.infer<typeof sendMessageSchema.body>;