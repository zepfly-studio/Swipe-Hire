import mongoose from 'mongoose';

// A help request from a user, answered by the support team in the admin panel.
const ticketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true, maxlength: 120 },
    category: { type: String, enum: ['account', 'payment', 'bug', 'other'], default: 'other' },
    status: { type: String, enum: ['open', 'answered', 'closed'], default: 'open', index: true },
    messages: [
      {
        from: { type: String, enum: ['user', 'admin'], required: true },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String, required: true, maxlength: 3000 },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

export const Ticket = mongoose.model('Ticket', ticketSchema);
