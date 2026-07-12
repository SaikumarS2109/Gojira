import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { Comment } from '@/models/Comment';
import { Card } from '@/models/Card';
import { List } from '@/models/List';
import { Board } from '@/models/Board';

const COMMENTS_PER_PAGE = 5;

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

    // Check authorization: user must be board member
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

    // Fetch comments (paginated, newest first, exclude soft-deleted)
    const skip = page * COMMENTS_PER_PAGE;
    const comments = await Comment.find({
      cardId,
      deletedAt: null,
    })
      .populate('authorId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(COMMENTS_PER_PAGE);

    // Get total count for pagination
    const total = await Comment.countDocuments({
      cardId,
      deletedAt: null,
    });

    return NextResponse.json({
      comments,
      total,
      page,
      hasMore: skip + COMMENTS_PER_PAGE < total,
    });
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
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
    const { cardId, content, mentions } = body;

    if (!cardId || !content) {
      return NextResponse.json(
        { error: 'cardId and content required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check authorization
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

    // Create comment
    const comment = new Comment({
      cardId,
      authorId: session.user.id,
      content,
      mentions: mentions || [],
    });

    await comment.save();
    await comment.populate('authorId', 'name email');

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
