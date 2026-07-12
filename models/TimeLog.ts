import mongoose from 'mongoose';

const timeLogSchema = new mongoose.Schema(
  {
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Card',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    description: String,
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const TimeLog =
  mongoose.models.TimeLog || mongoose.model('TimeLog', timeLogSchema);
