// Creates (or resets) an admin login: `npm run create-admin -- <email> <password> [name]`.
// Uses MONGO_URI from server/.env, so run it with the live database URI to create the live admin.
// The email must also be listed in ADMIN_EMAILS (server env) to get admin access.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { config } from '../src/config/index.js';
import { User } from '../src/models/User.js';

const [email, password, ...nameParts] = process.argv.slice(2);
if (!email || !password) {
  console.log('Usage: npm run create-admin -- <email> <password> [name]');
  process.exit(1);
}
if (password.length < 8) {
  console.log('Use a password of at least 8 characters for an admin.');
  process.exit(1);
}

await connectDB();
const normalized = email.toLowerCase().trim();
const hash = await bcrypt.hash(password, 10);
const existing = await User.findOne({ email: normalized });
if (existing) {
  // Reset the password, verify the email and log out every old session.
  await User.updateOne({ _id: existing._id }, { $set: { password: hash, emailVerified: true, suspended: false }, $inc: { tokenVersion: 1 } });
  console.log(`Updated ${normalized}: password reset, email verified.`);
} else {
  // Admins are plain accounts without a candidate/company profile; they only use /admin.
  await User.create({ name: nameParts.join(' ') || 'Admin', email: normalized, password: hash, role: 'candidate', emailVerified: true });
  console.log(`Created admin login ${normalized}.`);
}
if (!config.adminEmails.includes(normalized)) {
  console.log(`\nNote: ${normalized} is not in ADMIN_EMAILS yet. Add it to the server environment (and restart) to give it admin access.`);
}
await mongoose.disconnect();
