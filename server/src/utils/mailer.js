import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

const { host, port, user, pass, from } = config.smtp;
export const mailEnabled = Boolean(host && user && pass);

const transport = mailEnabled
  ? nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
  : null;

// Without SMTP settings (local development) emails are printed to the console.
export async function sendMail({ to, subject, text }) {
  if (!transport) {
    console.log(`[mail] to=${to} | ${subject}\n${text}\n`);
    return;
  }
  await transport.sendMail({ from, to, subject, text });
}
