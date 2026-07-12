import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { TimeLog } from '@/models/TimeLog';
import { Card } from '@/models/Card';
import { List } from '@/models/List';
import { Board } from '@/models/Board';

const TIMELOGS_PER_PAGE = 10;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('cardId');
    const page = parseInt(searchParams.get('page') || '0', 10);

    if (!cardId) {
      return NextResponse.json(
        { error: 'cardId query param required' },
        { status: 400 }
      );
    }

    await connectDB();

    const card = await Card.findById(cardId);
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const list = await List.findById(card.listId);
    const board = await Board.findById(list?.boardId);
    const isMember = board?.memberIds.some(
      (id: any) => id.toString() === session.user.id
    );
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const skip = page * TIMELOGS_PER_PAGE;
    const timelogs = await TimeLog.find({
      cardId,
      deletedAt: null,
    })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(TIMELOGS_PER_PAGE);

    const total = await TimeLog.countDocuments({
      cardId,
      deletedAt: null,
    });

    return NextResponse.json({
      timelogs,
      total,
      page,
      hasMore: skip + TIMELOGS_PER_PAGE < total,
    });
  } catch (error) {
    console.error('Get timelogs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timelogs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cardId, durationMinutes, description } = body;

    if (!cardId || !durationMinutes) {
      return NextResponse.json(
        { error: 'cardId and durationMinutes required' },
        { status: 400 }
      );
    }

    await connectDB();

    const card = await Card.findById(cardId);
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const list = await List.findById(card.listId);
    const board = await Board.findById(list?.boardId);
    const isMember = board?.memberIds.some(
      (id: any) => id.toString() === session.user.id
    );
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const timelog = new TimeLog({
      cardId,
      userId: session.user.id,
      durationMinutes,
      description,
    });

    await timelog.save();
    await timelog.populate('userId', 'name email');

    return NextResponse.json(timelog, { status: 201 });
  } catch (error) {
    console.error('Create timelog error:', error);
    return NextResponse.json(
      { error: 'Failed to create timelog' },
      { status: 500 }
    );
  }
}
