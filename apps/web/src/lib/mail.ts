import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

import { de } from "@/messages/de";

/**
 * Outgoing mail through one Gmail account (SMTP with an app password).
 * Optional: without SMTP_USER and SMTP_PASSWORD the app runs without mail and
 * password resets go through the support address and /admin instead.
 */
export function mailConfigured(): boolean {
  return !!(process.env.SMTP_USER?.includes("@") && process.env.SMTP_PASSWORD);
}

let transporter: Transporter | null = null;

function transport(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  return transporter;
}

type Mail = { to: string; subject: string; text: string; html: string };

/** Sends one mail from SMTP_USER, shown as "SpoolWorks". Throws if SMTP fails. */
export async function sendMail(mail: Mail): Promise<void> {
  await transport().sendMail({ from: { name: "SpoolWorks", address: process.env.SMTP_USER ?? "" }, ...mail });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/**
 * The reset mail. Plain text first; the HTML part only adds a button. Mail
 * clients ignore CSS variables, so the accent is inlined (like label paper,
 * one of the few places with raw colours).
 */
export function resetPasswordMail(to: string, name: string, url: string): Mail {
  const m = de.mail;
  const lines = [m.greeting(name), "", m.resetIntro, "", url, "", m.resetValid, m.resetIgnore];
  const link = escapeHtml(url);
  return {
    to,
    subject: m.resetSubject,
    text: lines.join("\n"),
    html: `<p>${escapeHtml(m.greeting(name))}</p>
<p>${escapeHtml(m.resetIntro)}</p>
<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#e3a11f;color:#2a1d03;text-decoration:none;border-radius:6px;font-weight:600">${escapeHtml(m.resetButton)}</a></p>
<p style="font-size:13px;color:#666">${escapeHtml(m.resetFallback)}<br><a href="${link}">${link}</a></p>
<p style="font-size:13px;color:#666">${escapeHtml(m.resetValid)} ${escapeHtml(m.resetIgnore)}</p>`,
  };
}
