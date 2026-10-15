import mongoose from 'mongoose';

// Audit trail: every change an admin makes.
const adminLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    adminEmail: String,
    action: { type: String, required: true }, // e.g. user.suspend, credits.add
    targetType: String, // user | company | job | payment | report | ticket | setting | coupon
    targetId: String,
    summary: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);
adminLogSchema.index({ createdAt: -1 });

export const AdminLog = mongoose.model('AdminLog', adminLogSchema);
