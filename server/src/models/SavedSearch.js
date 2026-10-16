import mongoose from 'mongoose';

// Swipe-screen filters saved under a name. With alerts on, the company is
// notified when a new candidate matching them goes live.
const savedSearchSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    filters: {
      role: String,
      location: String,
      minExp: Number,
      maxExp: Number,
      minSalary: Number,
      maxSalary: Number,
      workMode: { type: String, enum: ['onsite', 'remote', 'hybrid'] },
      notice: [String],
      skills: [String],
    },
    alerts: { type: Boolean, default: true },
    notifiedCandidates: { type: [mongoose.Schema.Types.ObjectId], default: [], select: false },
  },
  { timestamps: true },
);

export const SavedSearch = mongoose.model('SavedSearch', savedSearchSchema);
