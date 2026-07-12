import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { Label } from '@/models/Label';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';

  await connectDB();

  try {
    const query = search
      ? { name: { $regex: `^${search}`, $options: '' } }
      : {};
    const labels = await Label.find(query).sort({ name: 1 });
    return NextResponse.json(labels);
  } catch (err) {
    console.error('Error fetching labels:', err);
    return NextResponse.json({ error: 'Failed to fetch labels' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name } = await request.json();

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Label name is required' }, { status: 400 });
  }

  await connectDB();

  try {
    const trimmedName = name.trim();

    // Try to find existing label (case-sensitive exact match)
    let label = await Label.findOne({ name: trimmedName });

    if (label) {
      // Label exists, return it with 200
      return NextResponse.json(label, { status: 200 });
    }

    // Create new label
    label = new Label({ name: trimmedName });
    await label.save();
    return NextResponse.json(label, { status: 201 });
  } catch (err) {
    if ((err as any).code === 11000) {
      // Duplicate key error (shouldn't happen with our logic, but safety check)
      const existingLabel = await Label.findOne({ name: name.trim() });
      return NextResponse.json(existingLabel, { status: 200 });
    }
    console.error('Error creating label:', err);
    return NextResponse.json({ error: 'Failed to create label' }, { status: 500 });
  }
}
