import mongoose from 'mongoose';

// A chat message between a company and a candidate it has shortlisted.
const messageSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 2000 },
    readAt: Date,
  },
  { timestamps: true },
);
messageSchema.index({ company: 1, candidate: 1, createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);
