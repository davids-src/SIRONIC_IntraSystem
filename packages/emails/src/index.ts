import { ReactElement } from "react";
import { render } from "@react-email/render";
import { transporter } from "./transporter";

export interface SendEmailOptions {
  to: string;
  subject: string;
  template: ReactElement;
  lang?: "hu" | "en";
}

export const sendEmail = async ({
  to,
  subject,
  template,
}: SendEmailOptions): Promise<void> => {
  try {
    const html = await render(template);

    const fromName = process.env.SMTP_FROM_NAME || "SIRONIC";
    const fromEmail = process.env.SMTP_FROM_EMAIL || "no-reply@sironic.hu";
    const replyTo = process.env.SMTP_REPLY_TO || "hello@sironic.hu";

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      replyTo,
      subject,
      html,
    });
  } catch (error) {
    console.error("[Emails] Error sending email:", error);
    // Never throw to avoid breaking main application flow
  }
};

export * from "./transporter";
export * from "./i18n";
export * from "./templates";
