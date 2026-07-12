import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Card',
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      // Stored as JSON string (Tiptap JSON)
    },
    mentions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        email: String,
        name: String,
      },
    ],
    linkedTickets: [
      {
        cardId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Card',
        },
        ticketNumber: Number,
        title: String,
      },
    ],
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const Comment =
  mongoose.models.Comment || mongoose.model('Comment', commentSchema);
