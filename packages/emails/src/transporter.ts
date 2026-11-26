import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST || "";
const port = parseInt(process.env.SMTP_PORT || "465", 10);
const secure = process.env.SMTP_SECURE === "true" || port === 465;
const user = process.env.SMTP_USER || "";
const pass = process.env.SMTP_PASS || "";

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: {
    user,
    pass,
  },
});

// Verify connection configuration on startup
if (process.env.NODE_ENV !== "test") {
  transporter.verify(function (error, success) {
    if (error) {
      console.error("[Emails] SMTP connection error:", error);
    } else {
      console.log("[Emails] SMTP connection established successfully.");
    }
  });
}
