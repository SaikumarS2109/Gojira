import mongoose from 'mongoose';
import { User } from '../models/User';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx ts-node scripts/seed-admin.ts <email>');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in environment');
    process.exit(1);
  }

  await mongoose.connect(uri);

  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { role: 'admin' },
    { new: true }
  );

  if (!user) {
    console.error(`No user found with email: ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`✓ ${user.name} (${user.email}) is now an admin.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
