import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Board } from '@/models/Board';
import { connectDB } from '@/lib/mongodb';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const board = await Board.findById(id).select('enabledCardTypes');
    if (!board) {
      return Response.json({ error: 'Board not found' }, { status: 404 });
    }

    return Response.json({
      enabledCardTypes: board.enabledCardTypes,
    });
  } catch (error) {
    console.error('[GET card-types]', error);
    return Response.json({ error: 'Failed to fetch card types' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const { enabledCardTypes } = await request.json();

    // Validate enabledCardTypes
    const validTypes = ['Epic', 'Story', 'Subtask', 'Task', 'Bug'];
    if (!Array.isArray(enabledCardTypes) || !enabledCardTypes.every((t) => validTypes.includes(t))) {
      return Response.json({ error: 'Invalid card types' }, { status: 400 });
    }

    await connectDB();

    const board = await Board.findByIdAndUpdate(
      id,
      { enabledCardTypes },
      { new: true }
    ).select('enabledCardTypes');

    if (!board) {
      return Response.json({ error: 'Board not found' }, { status: 404 });
    }

    return Response.json({ enabledCardTypes: board.enabledCardTypes });
  } catch (error) {
    console.error('[PATCH card-types]', error);
    return Response.json({ error: 'Failed to update card types' }, { status: 500 });
  }
}
