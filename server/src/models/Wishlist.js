import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);
wishlistSchema.index({ company: 1, candidate: 1 }, { unique: true });

export const Wishlist = mongoose.model('Wishlist', wishlistSchema);
