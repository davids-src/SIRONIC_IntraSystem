import mongoose from "mongoose";
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://192.168.0.35:27017/sironic-intrasystem",
);
const db = mongoose.connection;
db.once("open", async () => {
  const users = await db.collection("portalusers").find().toArray();
  console.log("Portal Users:", users);
  process.exit(0);
});
