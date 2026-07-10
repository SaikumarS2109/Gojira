import { connectDB } from '@/lib/mongodb';
import { Board } from '@/models/Board';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const boards = await Board.find({
      $or: [{ ownerId: session.user.id }, { memberIds: session.user.id }],
    })
      .populate('ownerId', 'name email')
      .populate('memberIds', 'name email');

    return NextResponse.json(boards);
  } catch (error) {
    console.error('Get boards error:', error);
    return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, sequencePrefix } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!sequencePrefix) {
      return NextResponse.json({ error: 'Sequence prefix is required' }, { status: 400 });
    }

    const prefix = String(sequencePrefix).toUpperCase().trim();
    if (!/^[A-Z]{2,8}$/.test(prefix)) {
      return NextResponse.json(
        { error: 'Prefix must be 2–8 letters (A–Z only)' },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await Board.findOne({ sequencePrefix: prefix });
    if (existing) {
      return NextResponse.json(
        { error: `Prefix "${prefix}" is already in use` },
        { status: 409 }
      );
    }

    const board = await Board.create({
      title,
      sequencePrefix: prefix,
      ownerId: session.user.id,
      memberIds: [session.user.id],
    });

    await board.populate('ownerId', 'name email');
    await board.populate('memberIds', 'name email');

    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    console.error('Create board error:', error);
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}
