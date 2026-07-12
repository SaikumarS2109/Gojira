import mongoose from 'mongoose';
import { Card } from '../models/Card';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in environment');
    process.exit(1);
  }

  await mongoose.connect(uri);

  try {
    console.log('Starting card type backfill...');

    // Find cards without a type
    const cardsWithoutType = await Card.find({ type: { $exists: false } });
    console.log(`Found ${cardsWithoutType.length} cards without a type`);

    if (cardsWithoutType.length > 0) {
      // Backfill all cards without a type with default type 'Story'
      const result = await Card.updateMany(
        { type: { $exists: false } },
        { $set: { type: 'Story' } }
      );
      console.log(`✓ Backfilled ${result.modifiedCount} cards with type 'Story'`);
    } else {
      console.log('✓ No cards need backfilling');
    }

    // Verify backfill
    const cardsWithoutTypeAfter = await Card.find({ type: { $exists: false } });
    console.log(`Verification: ${cardsWithoutTypeAfter.length} cards still without type`);

    console.log('✓ Backfill complete');
  } catch (err) {
    console.error('Error during backfill:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
