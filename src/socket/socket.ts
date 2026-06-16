import { Server } from "socket.io";
import onlineUsers from "./onlineUsers";
import { setIO } from "./socketInstance";
import jwt from "jsonwebtoken";
import { join, resolve } from "path";
import { config } from "dotenv";
config({ path: join(process.cwd(), "config", ".env") });
//config({ path: resolve("./config/.env") });

export const initSocket = (httpServer: any) => {
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  setIO(io);

  io.use((socket, next) => {
    const rawToken = socket.handshake.auth?.token || socket.handshake.headers?.token;
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

    console.log("TOKEN:", token);
    console.log("SECRET:", process.env.JWT_SECRET);

    if (!token) return next(new Error("Authentication error"));

    try {
      const decoded = jwt.verify(token as string, process.env.JWT_SECRET!) as any;
      console.log("DECODED:", decoded);
      socket.data.userId = decoded.id || decoded._id;
      next();
    } catch (err) {
      console.log("JWT ERROR:", err);
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket Connected:", socket.id);

    const userId = socket.data.userId;
    onlineUsers.set(userId, socket.id);
    io.emit("user-online", userId);

    socket.on("typing", ({ receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing", { senderId: userId });
      }
    });

    socket.on("stop-typing", ({ receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("stop-typing", { senderId: userId });
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket Disconnected:", socket.id);
      onlineUsers.delete(userId);
      io.emit("user-offline", userId);
    });
  });

  return io;
};