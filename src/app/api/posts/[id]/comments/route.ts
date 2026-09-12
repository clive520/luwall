import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { filterProfanity } from '@/lib/profanity';
import { Comment } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const comments = db.getCommentsByPostId(id);
  return NextResponse.json({ comments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const body = await request.json();
    const { content, authorName } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: '留言內容不能為空' }, { status: 400 });
    }

    const post = db.getPostById(id);
    if (!post) {
      return NextResponse.json({ error: '找不到貼文' }, { status: 404 });
    }

    const board = db.getBoardById(post.boardId);
    let finalContent = content.trim();
    if (board?.profanityFilter) {
      finalContent = filterProfanity(finalContent);
    }

    const name = user ? user.name : (authorName && authorName.trim() ? authorName.trim() : '匿名學生');

    const newComment: Comment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      postId: id,
      authorId: user?.id,
      authorName: name,
      content: finalContent,
      createdAt: new Date().toISOString(),
    };

    db.createComment(newComment);
    return NextResponse.json({ success: true, comment: newComment });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '留言失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
