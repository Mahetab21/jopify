import { Server } from "socket.io";
import { Server as HttpServer } from "node:http";
import onlineUsers from "./onlineUsers";
import { setIO } from "./socketInstance";
import { decodedTokenAndFetchUser, GetSignature } from "../utils/token";
import { allowedOrigins } from "../config/environment";

export const initSocket = (httpServer: HttpServer) => {
  const io = new Server(httpServer, { cors: { origin: allowedOrigins() } });
  setIO(io);
  io.use(async (socket, next) => {
    try {
      const raw = socket.handshake.auth?.token || socket.handshake.headers.token;
      if (typeof raw !== "string") throw new Error("Missing token");
      const parts = raw.trim().split(/\s+/);
      const prefix = parts.length === 1 ? (process.env.BEARER_USER || "Bearer") : parts[0]!;
      const token = parts.length === 1 ? parts[0]! : parts[1]!;
      const signatures = await GetSignature(prefix);
      if (!signatures || parts.length > 2) throw new Error("Invalid token");
      const { user } = await decodedTokenAndFetchUser(token, signatures);
      socket.data.userId = user._id.toString();
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });
  io.on("connection", socket => {
    const userId: string = socket.data.userId;
    const sessions = onlineUsers.get(userId) || new Set<string>();
    const wasOffline = sessions.size === 0;
    sessions.add(socket.id);
    onlineUsers.set(userId, sessions);
    socket.join(`user:${userId}`);
    if (wasOffline) io.emit("user-online", userId);
    for (const event of ["typing", "stop-typing"]) {
      socket.on(event, payload => {
        const receiverId = payload?.receiverId;
        if (typeof receiverId === "string" && /^[0-9a-fA-F]{24}$/.test(receiverId)) {
          io.to(`user:${receiverId}`).emit(event, { senderId: userId });
        }
      });
    }
    socket.on("disconnect", () => {
      sessions.delete(socket.id);
      if (!sessions.size) {
        onlineUsers.delete(userId);
        io.emit("user-offline", userId);
      }
    });
  });
  return io;
};
