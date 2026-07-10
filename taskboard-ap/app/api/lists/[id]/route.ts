import { connectDB } from '@/lib/mongodb';
import { Board } from '@/models/Board';
import { List } from '@/models/List';
import { Card } from '@/models/Card';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, order } = body;

    await connectDB();

    const list = await List.findById(params.id);
    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    const board = await Board.findById(list.boardId);
    const isMember = board?.memberIds.some((id: any) => id.toString() === session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (title) list.title = title;
    if (order !== undefined) list.order = order;

    await list.save();
    return NextResponse.json(list);
  } catch (error) {
    console.error('Update list error:', error);
    return NextResponse.json({ error: 'Failed to update list' }, { status: 500 });
  }
}

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

    const list = await List.findById(params.id);
    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    const board = await Board.findById(list.boardId);
    const isMember = board?.memberIds.some((id: any) => id.toString() === session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete all cards in this list
    await Card.deleteMany({ listId: params.id });

    // Delete list
    await List.findByIdAndDelete(params.id);

    return NextResponse.json({ message: 'List deleted' });
  } catch (error) {
    console.error('Delete list error:', error);
    return NextResponse.json({ error: 'Failed to delete list' }, { status: 500 });
  }
}
