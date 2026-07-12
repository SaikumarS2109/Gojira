import mongoose from 'mongoose';

const labelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export const Label = mongoose.models.Label || mongoose.model('Label', labelSchema);
