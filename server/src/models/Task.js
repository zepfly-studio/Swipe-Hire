import mongoose from 'mongoose';

// An assignment a company sends a shortlisted candidate before the interview.
// The candidate submits a live link and/or a GitHub repo before the deadline.
const taskSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 5000 },
    // Optional reference link from the company (brief, Figma, docs).
    briefUrl: String,
    dueAt: { type: Date, required: true },
    status: { type: String, enum: ['assigned', 'submitted', 'cancelled'], default: 'assigned' },
    submission: {
      liveUrl: String,
      repoUrl: String,
      note: { type: String, maxlength: 1000 },
      at: Date,
    },
  },
  { timestamps: true },
);

export const Task = mongoose.model('Task', taskSchema);
