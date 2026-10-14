import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

const { host, port, user, pass, from } = config.smtp;

// Email goes out through an HTTPS API when one is configured: many hosts (e.g. Render's
// free plan) block outgoing SMTP ports, which made sending hang.
// - Brevo (BREVO_API_KEY): can send to anyone from a single verified sender address,
//   so it works before the site has its own domain.
// - Resend (RESEND_API_KEY, or SMTP_HOST=smtp.resend.com with the key as SMTP_PASS):
//   needs a verified domain to email anyone other than the account owner.
const brevoKey = process.env.BREVO_API_KEY || '';
const resendKey = process.env.RESEND_API_KEY || (host === 'smtp.resend.com' ? pass : '');
const smtpEnabled = !brevoKey && !resendKey && Boolean(host && user && pass);
export const mailEnabled = Boolean(brevoKey || resendKey || smtpEnabled);

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

// "Swipe Hire <no-reply@x.com>" -> { name, email }
function parseFrom(value) {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value);
  return m ? { name: m[1] || undefined, email: m[2] } : { email: value.trim() };
}

async function post(url, headers, body, label) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`${label} ${res.status}: ${detail.slice(0, 300)}`);
  }
}

const sendWithBrevo = ({ to, subject, text }) =>
  post('https://api.brevo.com/v3/smtp/email', { 'api-key': brevoKey }, { sender: parseFrom(from), to: [{ email: to }], subject, textContent: text }, 'Brevo');

const sendWithResend = ({ to, subject, text }) =>
  post('https://api.resend.com/emails', { Authorization: `Bearer ${resendKey}` }, { from, to: [to], subject, text }, 'Resend');

// Without email settings (local development) emails are printed to the console.
export async function sendMail(mail) {
  if (brevoKey) return sendWithBrevo(mail);
  if (resendKey) return sendWithResend(mail);
  if (!transport) {
    console.log(`[mail] to=${mail.to} | ${mail.subject}\n${mail.text}\n`);
    return;
  }
  await transport.sendMail({ from, to: mail.to, subject: mail.subject, text: mail.text });
}
