import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['candidate', 'company'], required: true },
    // Team accounts: a recruiter invited by a company points at the company
    // owner's user id. Owners (and candidates) leave this empty.
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    avatarUrl: String, // profile photo
    phone: String, // recruiters' own contact number (candidates keep theirs on the profile)
    // Proven by a 6-digit code sent to the email (or by accepting a team invite email).
    emailVerified: { type: Boolean, default: false },
    // Current code (hashed) plus daily send/failure counters, so codes can't be brute-forced.
    // `dev` holds the plain code only in local development without email, for testing.
    emailOtp: {
      type: { hash: String, expires: Date, sentAt: Date, tries: Number, sends: Number, fails: Number, windowStart: Date, dev: String },
      select: false,
    },
    // Set by an admin: the account can't log in and (for candidates) is hidden from companies.
    suspended: { type: Boolean, default: false, index: true },
    // Bumped on password change / "log out everywhere": every older login stops working.
    tokenVersion: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
