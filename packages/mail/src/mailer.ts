import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { connectDB, MailTemplate } from "@erp/db-core";
import type { Types } from "mongoose";
import { getSmtpFrom, isSmtpConfigured } from "./env";
import { renderTemplateString } from "./template";
import {
  getActorEmail,
  mergeRecipientEmails,
  resolveTemplateRecipientEmails,
} from "./recipients";

export type SendTemplatedEmailOptions = {
  templateKey: string;
  to: string | string[];
  variables: Record<string, string>;
  /** Person whose action triggered the mail — used as Reply-To. */
  actorEmail?: string;
  actorUserId?: Types.ObjectId | string;
  /**
   * Personal mail (e.g. a notification to one user): do not add the template's own extra
   * recipients (roles / users set on the template), or they would get everyone's mail.
   */
  skipTemplateRecipients?: boolean;
};

export type SendTemplatedEmailResult = {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  messageId?: string;
  recipients?: string[];
};

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!isSmtpConfigured()) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure =
      process.env.SMTP_SECURE?.trim() === "1" ||
      process.env.SMTP_SECURE?.trim().toLowerCase() === "true";
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
  }
  return transporter;
}

export async function sendTemplatedEmail(
  options: SendTemplatedEmailOptions,
): Promise<SendTemplatedEmailResult> {
  await connectDB();

  const template = await MailTemplate.findOne({
    key: options.templateKey,
    isActive: true,
  }).exec();

  if (!template) {
    return {
      sent: false,
      skipped: true,
      reason: `Template not found: ${options.templateKey}`,
    };
  }

  if (!template.enabled) {
    return {
      sent: false,
      skipped: true,
      reason: `Template disabled: ${options.templateKey}`,
    };
  }

  const transport = getTransporter();
  if (!transport) {
    return { sent: false, skipped: true, reason: "SMTP not configured" };
  }

  const primary = Array.isArray(options.to) ? options.to : [options.to];
  const extra = options.skipTemplateRecipients
    ? []
    : await resolveTemplateRecipientEmails(template);
  const recipients = mergeRecipientEmails(primary, extra);

  if (recipients.length === 0) {
    return { sent: false, skipped: true, reason: "No recipients" };
  }

  const subject = renderTemplateString(template.subject, options.variables);
  const html = renderTemplateString(template.body, options.variables);

  const replyTo =
    options.actorEmail?.trim() ||
    (options.actorUserId ? await getActorEmail(options.actorUserId) : undefined) ||
    getSmtpFrom();

  const from = getSmtpFrom();

  const info = await transport.sendMail({
    from,
    to: recipients.join(", "),
    subject,
    html,
    replyTo,
  });

  return {
    sent: true,
    messageId: info.messageId,
    recipients,
  };
}

export type SendMailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  /** Person on whose behalf the mail goes out — used as Reply-To, like in `sendTemplatedEmail`. */
  actorEmail?: string;
  actorUserId?: Types.ObjectId | string;
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
};

/**
 * Free-form mail without a stored template (e.g. a message HR writes to an employee). Sent from
 * the system address; Reply-To is the actor, so the answer lands in their own inbox.
 */
export async function sendMail(
  options: SendMailOptions,
): Promise<SendTemplatedEmailResult> {
  const transport = getTransporter();
  if (!transport) {
    return { sent: false, skipped: true, reason: "SMTP not configured" };
  }

  const recipients = mergeRecipientEmails(
    Array.isArray(options.to) ? options.to : [options.to],
    [],
  );
  if (recipients.length === 0) {
    return { sent: false, skipped: true, reason: "No recipients" };
  }

  const replyTo =
    options.actorEmail?.trim() ||
    (options.actorUserId ? await getActorEmail(options.actorUserId) : undefined) ||
    getSmtpFrom();

  const info = await transport.sendMail({
    from: getSmtpFrom(),
    to: recipients.join(", "),
    subject: options.subject,
    html: options.html,
    replyTo,
    attachments: options.attachments,
  });

  return { sent: true, messageId: info.messageId, recipients };
}
