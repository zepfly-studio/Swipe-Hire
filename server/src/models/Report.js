import mongoose from 'mongoose';

// A user reporting another user (a candidate reporting a company, or the other way round).
export const REPORT_REASONS = ['fake', 'spam', 'abuse', 'scam', 'inappropriate', 'other'];

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    target: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // company owner id for companies
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, maxlength: 1000 },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open', index: true },
    resolution: { type: String, maxlength: 500 },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    handledAt: Date,
  },
  { timestamps: true },
);

export const Report = mongoose.model('Report', reportSchema);
