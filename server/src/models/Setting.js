import mongoose from 'mongoose';

// Site-wide settings an admin can change without a deploy (plans, maintenance, content...).
// One document per key; see utils/settings.js for the keys and their defaults.
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const Setting = mongoose.model('Setting', settingSchema);
