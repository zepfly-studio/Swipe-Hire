import mongoose from 'mongoose';

const teamInviteSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    tokenHash: { type: String, required: true, unique: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expires: { type: Date, required: true },
    acceptedAt: Date,
  },
  { timestamps: true },
);

export const TeamInvite = mongoose.model('TeamInvite', teamInviteSchema);
