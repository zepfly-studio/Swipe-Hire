import mongoose from 'mongoose';
import { config } from '../config/index.js';

const companyProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    completed: { type: Boolean, default: false },

    companyName: String,
    industry: String,
    website: String,
    companySize: String,
    location: String,
    about: String,
    logoUrl: String,
    address: String,
    phone: String, // shown to candidates the company shortlisted
    contactEmail: String,
    linkedin: String,
    foundedYear: Number,

    hiringFor: String,
    requiredSkills: [String],
    minExperience: Number,
    maxExperience: Number,
    salaryMin: Number, // LPA
    salaryMax: Number, // LPA
    jobLocation: String,
    workMode: { type: String, enum: ['onsite', 'remote', 'hybrid'], default: 'onsite' },

    // Verified badge: by work-email OTP (automatic) or GSTIN (approved by an admin).
    gstin: String,
    verification: {
      status: { type: String, enum: ['none', 'pending', 'verified', 'rejected'], default: 'none' },
      method: { type: String, enum: ['email', 'gst'] },
      verifiedAt: Date,
    },
    // sends/fails count across codes for a day (windowStart), so codes can't be brute-forced by re-sending.
    emailOtp: { type: { hash: String, expires: Date, tries: Number, sends: Number, fails: Number, windowStart: Date }, select: false },

    swipesLeft: { type: Number, default: () => config.freeSwipes, min: 0 },
    swipesPurchased: { type: Number, default: 0 },
    // Order ids already credited; makes crediting idempotent in one atomic write.
    creditedOrders: { type: [String], default: [], select: false },
  },
  { timestamps: true },
);

export const CompanyProfile = mongoose.model('CompanyProfile', companyProfileSchema);
