import mongoose from 'mongoose';

// A role the company is hiring for. Each job has its own swipe feed and pipeline.
// Field names match what utils/match.js expects.
const jobSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    requiredSkills: [String],
    minExperience: Number,
    maxExperience: Number,
    salaryMin: Number, // LPA
    salaryMax: Number, // LPA
    jobLocation: String,
    workMode: { type: String, enum: ['onsite', 'remote', 'hybrid'], default: 'onsite' },
    jobType: { type: String, enum: ['full-time', 'part-time', 'internship', 'contract'], default: 'full-time' },
    openings: { type: Number, default: 1, min: 1 },
    description: { type: String, maxlength: 3000 },
    status: { type: String, enum: ['open', 'paused', 'closed'], default: 'open' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const Job = mongoose.model('Job', jobSchema);
