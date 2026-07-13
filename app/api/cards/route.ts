import { connectDB } from '@/lib/mongodb';
import { List } from '@/models/List';
import { Card } from '@/models/Card';
import { Board } from '@/models/Board';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { listId, title, description, type } = body;

    if (!listId || !title) {
      return NextResponse.json({ error: 'listId and title are required' }, { status: 400 });
    }

    await connectDB();

    const list = await List.findById(listId);
    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    // Membership gate — read-only, before touching the counter
    const board = await Board.findById(list.boardId);
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    const isMember = board.memberIds.some(
      (id: any) => id.toString() === session.user.id
    );
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Atomically claim the next ticket number only after membership is confirmed
    const boardBefore = await Board.findByIdAndUpdate(
      list.boardId,
      { $inc: { nextTicketNumber: 1 } },
      { new: false }
    );

    const maxOrder = await Card.findOne({ listId }).sort({ order: -1 });
    const newOrder = (maxOrder?.order ?? -1) + 1;

    const card = await Card.create({
      listId,
      title,
      description: description || '',
      type,
      order: newOrder,
      ticketNumber: boardBefore!.nextTicketNumber,
    });

    await card.populate('assigneeId', 'name email');

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error('Create card error:', error);
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}
