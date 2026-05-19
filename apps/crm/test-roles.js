require("dotenv").config();
const mongoose = require("mongoose");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await mongoose.connection.collection("crmusers").find({}).toArray();
  console.log(
    JSON.stringify(
      users.map((u) => ({ email: u.email, roleKeys: u.roleKeys, roles: u.roles })),
      null,
      2,
    ),
  );
  process.exit(0);
}

run().catch(console.error);
