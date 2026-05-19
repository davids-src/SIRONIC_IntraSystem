import { connectDb, CrmUserModel } from "@crm/db";

async function run() {
  await connectDb();
  const users = await CrmUserModel.find({}).lean();
  console.log(JSON.stringify(users, null, 2));
  process.exit(0);
}

run().catch(console.error);
