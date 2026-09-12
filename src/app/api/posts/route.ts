import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { filterProfanity } from '@/lib/profanity';
import { extractYouTubeId } from '@/lib/media';
import { Post } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const {
      boardId,
      title = '',
      content = '',
      authorName,
      color = '#fef08a',
      attachment,
    } = body;

    if (!boardId) {
      return NextResponse.json({ error: '缺少看板 ID' }, { status: 400 });
    }

    const board = db.getBoardById(boardId);
    if (!board) {
      return NextResponse.json({ error: '找不到此看板' }, { status: 404 });
    }

    // 檢查訪客權限
    if (!user && !board.allowGuest) {
      return NextResponse.json({ error: '此看板限定登入後方可發表內容' }, { status: 403 });
    }

    // 發布者姓名：優先取登入者真實姓名，否則取訪客填寫或預設匿名
    const displayName = user ? user.name : (authorName && authorName.trim() ? authorName.trim() : '匿名學生');
    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

    // 不雅詞過濾
    let processedTitle = title.trim();
    let processedContent = content.trim();

    if (board.profanityFilter) {
      processedTitle = filterProfanity(processedTitle);
      processedContent = filterProfanity(processedContent);
    }

    // 處理媒體附件 (若為 YouTube 連結自動提取 ID)
    let finalAttachment = attachment;
    if (attachment && attachment.type === 'link' && attachment.url) {
      const ytId = extractYouTubeId(attachment.url);
      if (ytId) {
        finalAttachment = {
          ...attachment,
          metadata: { ...attachment.metadata, youtubeId: ytId },
        };
      }
    }

    // 審核狀態：若是老師本人發布，或看板未開啟審核，則直接 approved
    const status = board.requireApproval && !isTeacher ? 'pending' : 'approved';

    const newPost: Post = {
      id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      boardId,
      authorId: user?.id,
      authorName: displayName,
      isAuthorTeacher: isTeacher,
      title: processedTitle,
      content: processedContent,
      color,
      attachment: finalAttachment,
      status,
      orderIndex: 0,
      likeCount: 0,
      upvotes: 0,
      downvotes: 0,
      starAverage: 0,
      starCount: 0,
      commentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.createPost(newPost);
    return NextResponse.json({ success: true, post: newPost });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '發表貼文失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 審核或更新貼文狀態
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const { postId, status, title, content, color } = body;

    if (!postId) {
      return NextResponse.json({ error: '缺少貼文 ID' }, { status: 400 });
    }

    const post = db.getPostById(postId);
    if (!post) {
      return NextResponse.json({ error: '找不到此貼文' }, { status: 404 });
    }

    const board = db.getBoardById(post.boardId);
    const isTeacher = user?.role === 'teacher' || user?.role === 'admin' || user?.id === board?.createdBy;

    // 若要審核狀態，必須是板主或老師
    if (status && !isTeacher) {
      return NextResponse.json({ error: '您沒有審核此貼文的權限' }, { status: 403 });
    }

    const updates: Partial<Post> = {};
    if (status) updates.status = status;
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (color !== undefined) updates.color = color;

    const updated = db.updatePost(postId, updates);
    return NextResponse.json({ success: true, post: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '更新貼文失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: '缺少貼文 ID' }, { status: 400 });
    }

    const post = db.getPostById(postId);
    if (!post) {
      return NextResponse.json({ error: '找不到此貼文' }, { status: 404 });
    }

    const board = db.getBoardById(post.boardId);
    const isTeacher = user?.role === 'teacher' || user?.role === 'admin' || user?.id === board?.createdBy;
    const isAuthor = user && user.id === post.authorId;

    if (!isTeacher && !isAuthor) {
      return NextResponse.json({ error: '您沒有刪除此貼文的權限' }, { status: 403 });
    }

    db.deletePost(postId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '刪除貼文失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
