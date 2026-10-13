import mongoose from 'mongoose';

// The company proposes up to 3 time slots; the candidate confirms one.
const interviewSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    slots: { type: [Date], required: true },
    chosenSlot: Date,
    durationMins: { type: Number, default: 30 },
    mode: { type: String, enum: ['video', 'phone', 'in-person'], default: 'video' },
    meetingLink: String,
    location: String,
    note: String,
    status: { type: String, enum: ['proposed', 'confirmed', 'cancelled'], default: 'proposed' },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const Interview = mongoose.model('Interview', interviewSchema);
