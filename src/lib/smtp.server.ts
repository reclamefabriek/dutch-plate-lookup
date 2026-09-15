// Server-only: SMTP-verzending via de eigen mailbox van het bedrijf.
// Wordt pas actief zodra SMTP_HOST, SMTP_USER en SMTP_PASS als secrets zijn
// ingesteld; daarna gaat elke aanvraag rechtstreeks via hun eigen mailbox.
import nodemailer from "nodemailer";

export function smtpConfigured(): boolean {
  return Boolean(
    process.env["SMTP_HOST"] &&
      process.env["SMTP_USER"] &&
      process.env["SMTP_PASS"],
  );
}

export async function sendViaSmtp(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  const port = Number(process.env["SMTP_PORT"] ?? "587");
  const transporter = nodemailer.createTransport({
    host: process.env["SMTP_HOST"]!,
    port,
    secure: port === 465,
    auth: {
      user: process.env["SMTP_USER"]!,
      pass: process.env["SMTP_PASS"]!,
    },
  });

  const info = await transporter.sendMail({
    from: process.env["SMTP_FROM"] ?? process.env["SMTP_USER"]!,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });

  return info;
}
