import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
    throw new AppError(
      "El envío de correos no está configurado en el servidor (faltan variables SMTP_*).",
      503
    );
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

export async function sendReportEmail(params: {
  toEmail: string;
  subject: string;
  text: string;
  attachmentFilename: string;
  attachmentBuffer: Buffer;
  attachmentContentType: string;
}) {
  const client = getTransporter();
  await client.sendMail({
    from: env.smtp.from,
    to: params.toEmail,
    subject: params.subject,
    text: params.text,
    attachments: [
      {
        filename: params.attachmentFilename,
        content: params.attachmentBuffer,
        contentType: params.attachmentContentType,
      },
    ],
  });
}
