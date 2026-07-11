import { connectDB } from '@/lib/mongodb';
import { Card } from '@/models/Card';
import { List } from '@/models/List';
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

    const card = await Card.findById(id);
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const list = await List.findById(card.listId);
    const board = await Board.findById(list?.boardId);
    if (!board || !board.memberIds.some((mid: any) => mid.toString() === session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await card.populate('assigneeId', 'name email');
    return NextResponse.json(card);
  } catch (error) {
    console.error('Get card error:', error);
    return NextResponse.json({ error: 'Failed to fetch card' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, listId, order, assigneeId } = body;

    await connectDB();

    const card = await Card.findById(id);
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const list = await List.findById(card.listId);
    const board = await Board.findById(list?.boardId);
    const isMember = board?.memberIds.some((id: any) => id.toString() === session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (title !== undefined) card.title = title;
    if (description !== undefined) card.description = description;
    if (listId !== undefined) card.listId = listId;
    if (order !== undefined) card.order = order;
    if (assigneeId !== undefined) card.assigneeId = assigneeId || null;

    await card.save();
    await card.populate('assigneeId', 'name email');

    return NextResponse.json(card);
  } catch (error) {
    console.error('Update card error:', error);
    return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
  }
}

export async function DELETE(
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

    const card = await Card.findById(id);
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const list = await List.findById(card.listId);
    const board = await Board.findById(list?.boardId);
    const isMember = board?.memberIds.some((id: any) => id.toString() === session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await Card.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Card deleted' });
  } catch (error) {
    console.error('Delete card error:', error);
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
  }
}
