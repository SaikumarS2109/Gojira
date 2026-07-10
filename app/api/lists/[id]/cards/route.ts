import { connectDB } from '@/lib/mongodb';
import { List } from '@/models/List';
import { Card } from '@/models/Card';
import { Board } from '@/models/Board';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const list = await List.findById(id);
    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    const board = await Board.findById(list.boardId);
    const isMember = board?.memberIds.some((id: any) => id.toString() === session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const cards = await Card.find({ listId: id })
      .sort({ order: 1 })
      .populate('assigneeId', 'name email');

    return NextResponse.json(cards);
  } catch (error) {
    console.error('Get cards error:', error);
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}
