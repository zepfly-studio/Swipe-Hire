import mongoose from 'mongoose';

const swipeSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Which of the company's jobs this swipe was for (a candidate can be swiped once per job).
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    action: { type: String, enum: ['left', 'right'], required: true },
    // Hiring pipeline for shortlisted (right-swiped) candidates.
    stage: { type: String, enum: ['shortlisted', 'contacted', 'task', 'interview', 'hired', 'rejected'], default: 'shortlisted' },
    notes: { type: String, maxlength: 2000 },
    swipedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
swipeSchema.index({ company: 1, candidate: 1, job: 1 }, { unique: true });
swipeSchema.index({ company: 1, createdAt: -1 });

export const Swipe = mongoose.model('Swipe', swipeSchema);
