import mongoose from "mongoose";

const connectionDB = async () => {
  await mongoose.connect(process.env.DB_URL!, { serverSelectionTimeoutMS: 10000 });
  console.log("MongoDB connected");
};
export default connectionDB;
