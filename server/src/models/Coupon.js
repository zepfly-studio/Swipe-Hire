import mongoose from 'mongoose';

// Discount codes for swipe-credit plans.
const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    percentOff: { type: Number, required: true, min: 1, max: 90 },
    active: { type: Boolean, default: true },
    expiresAt: Date,
    maxUses: Number, // empty = unlimited
    uses: { type: Number, default: 0 },
    planIds: [String], // empty = every plan
  },
  { timestamps: true },
);

export const Coupon = mongoose.model('Coupon', couponSchema);
