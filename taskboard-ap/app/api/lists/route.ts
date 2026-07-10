import { connectDB } from '@/lib/mongodb';
import { Board } from '@/models/Board';
import { List } from '@/models/List';
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
    const { boardId, title } = body;

    if (!boardId || !title) {
      return NextResponse.json({ error: 'boardId and title are required' }, { status: 400 });
    }

    await connectDB();

    const board = await Board.findById(boardId);
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Check if user is member of board
    const isMember = board.memberIds.some((id: any) => id.toString() === session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const maxOrder = await List.findOne({ boardId }).sort({ order: -1 });
    const newOrder = (maxOrder?.order ?? -1) + 1;

    const list = await List.create({
      boardId,
      title,
      order: newOrder,
    });

    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    console.error('Create list error:', error);
    return NextResponse.json({ error: 'Failed to create list' }, { status: 500 });
  }
}
