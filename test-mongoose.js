const mongoose = require("mongoose");
const { Schema } = mongoose;

const companyDetailsSchema = new Schema({
  name: { type: String, default: null },
});

try {
  const settingsSchema = new Schema({
    company_details: { type: companyDetailsSchema, default: {} },
  });
  console.log("Success");
} catch (err) {
  console.error("Error creating schema:", err.message);
}
