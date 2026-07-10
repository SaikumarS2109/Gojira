import mongoose from 'mongoose';

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    sequencePrefix: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{2,8}$/,
    },
    nextTicketNumber: {
      type: Number,
      default: 1,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    memberIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

boardSchema.index({ sequencePrefix: 1 }, { unique: true });

export const Board = mongoose.models.Board || mongoose.model('Board', boardSchema);
