import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planId: { type: String, required: true },
    amount: { type: Number, required: true }, // rupees
    swipes: { type: Number, required: true },
    orderId: { type: String, required: true, unique: true },
    paymentId: String,
    mode: { type: String, enum: ['razorpay', 'demo'], required: true },
    status: { type: String, enum: ['created', 'paid'], default: 'created' },
  },
  { timestamps: true },
);

export const Payment = mongoose.model('Payment', paymentSchema);
