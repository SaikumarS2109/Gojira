import { connectDB } from '@/lib/mongodb';
import { Board } from '@/models/Board';
import { List } from '@/models/List';
import { Card } from '@/models/Card';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const board = await Board.findById(params.id);
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    if (board.ownerId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete all cards in lists of this board
    const lists = await List.find({ boardId: params.id });
    const listIds = lists.map((l) => l._id);
    await Card.deleteMany({ listId: { $in: listIds } });

    // Delete all lists
    await List.deleteMany({ boardId: params.id });

    // Delete board
    await Board.findByIdAndDelete(params.id);

    return NextResponse.json({ message: 'Board deleted' });
  } catch (error) {
    console.error('Delete board error:', error);
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
  }
}
