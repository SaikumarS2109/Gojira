import { connectDB } from '@/lib/mongodb';
import { Board } from '@/models/Board';
import { List } from '@/models/List';
import { Card } from '@/models/Card';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, order } = body;

    await connectDB();

    const list = await List.findById(id);
    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const list = await List.findById(id);
    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    await Card.deleteMany({ listId: id });
    await List.findByIdAndDelete(id);

    return NextResponse.json({ message: 'List deleted' });
  } catch (error) {
    console.error('Delete list error:', error);
    return NextResponse.json({ error: 'Failed to delete list' }, { status: 500 });
  }
}
