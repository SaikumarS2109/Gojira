import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema(
  {
    listId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'List',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      nullable: true,
    },
    parentCardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Card',
      nullable: true,
    },
    subtasks: [
      {
        text: String,
        done: Boolean,
      },
    ],
    attachments: [String],
    order: {
      type: Number,
      default: 0,
    },
    ticketNumber: {
      type: Number,
    },
    labelIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Label',
      },
    ],
    storyPoints: {
      type: Number,
      enum: [1, 2, 3, 5, 8, 13, 21, null],
      default: null,
    },
    type: {
      type: String,
      enum: ['Epic', 'Story', 'Subtask', 'Task', 'Bug'],
      required: true,
    },
  },
  { timestamps: true }
);

export const Card = mongoose.models.Card || mongoose.model('Card', cardSchema);
