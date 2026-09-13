import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { filterProfanity } from '@/lib/profanity';
import { Comment } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await db.ensureHydrated();
  const { id } = await params;
  const comments = db.getCommentsByPostId(id);
  return NextResponse.json({ comments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await db.ensureHydrated();
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

    const board = await db.getBoardByIdAsync(post.boardId);
    if (!board) {
      return NextResponse.json({ error: '找不到看板' }, { status: 404 });
    }

    const isAdmin = user?.role === 'admin';
    const isBoardOwner = Boolean(user && user.id === board.createdBy);
    const isTeacher = user?.role === 'teacher';
    const canReview = isAdmin || isBoardOwner || isTeacher;

    // 檢查 1：若便籤狀態為待審核 (pending)，僅開板老師/管理員可留言，一般使用者/訪客需等審核通過
    if (post.status === 'pending' && !canReview) {
      return NextResponse.json(
        { error: '此便籤尚在等待老師審核中，審核通過後方可留言' },
        { status: 403 }
      );
    }

    // 檢查 2：訪客留言權限與暱稱要求
    if (!user) {
      if (!board.allowGuest) {
        return NextResponse.json({ error: '此看板限定登入後方可發表留言' }, { status: 403 });
      }
      if (!authorName || !authorName.trim()) {
        return NextResponse.json({ error: '訪客留言必須填寫暱稱或座號' }, { status: 400 });
      }
    }

    let finalContent = content.trim();
    if (board.profanityFilter) {
      finalContent = filterProfanity(finalContent);
    }

    const name = user ? user.name : authorName.trim();

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

// 刪除留言
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await db.ensureHydrated();
    const { id: postId } = await params;
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json({ error: '缺少留言 ID' }, { status: 400 });
    }

    const comment = db.getCommentById(commentId);
    if (!comment || comment.postId !== postId) {
      return NextResponse.json({ error: '找不到此留言' }, { status: 404 });
    }

    // 訪客（未登入者）禁止刪除留言
    if (!user) {
      return NextResponse.json({ error: '訪客無權限刪除留言，請登入或聯絡板主老師' }, { status: 403 });
    }

    const post = db.getPostById(postId);
    const board = post ? await db.getBoardByIdAsync(post.boardId) : undefined;

    const isAdmin = user.role === 'admin';
    const isBoardOwner = Boolean(board && user.id === board.createdBy);
    const isAuthor = Boolean(comment.authorId && user.id === comment.authorId);

    // 權限檢查：留言作者本人、開板教師、系統管理員可刪除留言
    if (!isAdmin && !isBoardOwner && !isAuthor) {
      return NextResponse.json({ error: '權限不足：您只能刪除自己的留言' }, { status: 403 });
    }

    await db.deleteComment(commentId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '刪除留言失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
