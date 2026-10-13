import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true }, // shortlisted | message | interview | hired | verified
    title: { type: String, required: true },
    body: String,
    link: String, // client route to open, e.g. /messages?with=<id>
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: Date,
  },
  { timestamps: true },
);
notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
