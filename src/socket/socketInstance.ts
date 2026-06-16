import { Server } from "socket.io";

let io: Server;

export const setIO = (socketServer: Server) => {
  io = socketServer;
};

export const getIO = () => {
  return io;
}; 