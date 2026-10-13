import mongoose from 'mongoose';

// step: 0 = details pending, 1 = resume pending, 2 = video pending, 3 = complete
const candidateProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    step: { type: Number, default: 0, index: true },

    headline: String,
    phone: String,
    age: Number,
    gender: String,
    location: String,

    qualification: String,
    degree: String,
    college: String,
    graduationYear: Number,

    skills: [String],
    experienceYears: Number,
    currentCompany: String,
    currentPost: String,
    currentSalary: Number, // LPA
    expectedSalary: Number, // LPA, the minimum the candidate expects
    expectedSalaryMax: Number, // LPA, optional upper end of the range
    // When false, companies whose job budget is below expectedSalary can't shortlist them.
    salaryNegotiable: { type: Boolean, default: false },
    noticePeriod: String,
    about: String,

    resumeUrl: String,
    videoUrl: String,

    // Job preferences. Candidates who turn openToWork off are hidden from companies.
    openToWork: { type: Boolean, default: true },
    preferredLocations: [String],
    workModes: [{ type: String, enum: ['onsite', 'remote', 'hybrid'] }],
    jobTypes: [{ type: String, enum: ['full-time', 'part-time', 'internship', 'contract'] }],
  },
  { timestamps: true },
);

export const CandidateProfile = mongoose.model('CandidateProfile', candidateProfileSchema);
