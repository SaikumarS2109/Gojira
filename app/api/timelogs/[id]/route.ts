import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { TimeLog } from '@/models/TimeLog';

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
    const { durationMinutes, description } = body;

    if (!durationMinutes) {
      return NextResponse.json(
        { error: 'durationMinutes required' },
        { status: 400 }
      );
    }

    await connectDB();

    const timelog = await TimeLog.findById(id);
    if (!timelog) {
      return NextResponse.json({ error: 'TimeLog not found' }, { status: 404 });
    }

    if (timelog.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    timelog.durationMinutes = durationMinutes;
    timelog.description = description || '';
    await timelog.save();
    await timelog.populate('userId', 'name email');

    return NextResponse.json(timelog);
  } catch (error) {
    console.error('Update timelog error:', error);
    return NextResponse.json(
      { error: 'Failed to update timelog' },
      { status: 500 }
    );
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

    const timelog = await TimeLog.findById(id);
    if (!timelog) {
      return NextResponse.json({ error: 'TimeLog not found' }, { status: 404 });
    }

    if (timelog.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    timelog.deletedAt = new Date();
    await timelog.save();

    return NextResponse.json({ message: 'TimeLog deleted' });
  } catch (error) {
    console.error('Delete timelog error:', error);
    return NextResponse.json(
      { error: 'Failed to delete timelog' },
      { status: 500 }
    );
  }
}
