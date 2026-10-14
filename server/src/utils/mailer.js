import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

const { host, port, user, pass, from } = config.smtp;

// Resend is used through its HTTPS API rather than SMTP: many hosts (e.g. Render's free
// plan) block outgoing SMTP ports, which made sending hang. Set RESEND_API_KEY, or keep
// the SMTP settings with SMTP_HOST=smtp.resend.com and the key as SMTP_PASS.
const resendKey = process.env.RESEND_API_KEY || (host === 'smtp.resend.com' ? pass : '');
const smtpEnabled = !resendKey && Boolean(host && user && pass);
export const mailEnabled = Boolean(resendKey) || smtpEnabled;

const transport = smtpEnabled
  ? nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      // Fail fast instead of leaving the request hanging if the port is blocked.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    })
  : null;

async function sendWithResend({ to, subject, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}

// Without email settings (local development) emails are printed to the console.
export async function sendMail({ to, subject, text }) {
  if (resendKey) return sendWithResend({ to, subject, text });
  if (!transport) {
    console.log(`[mail] to=${to} | ${subject}\n${text}\n`);
    return;
  }
  await transport.sendMail({ from, to, subject, text });
}
