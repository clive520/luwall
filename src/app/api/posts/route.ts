import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { filterProfanity } from '@/lib/profanity';
import { extractYouTubeId, getYouTubeThumbnail, findUrls } from '@/lib/media';
import { Post } from '@/types';

export async function POST(request: NextRequest) {
  try {
    await db.ensureHydrated();
    const user = await getCurrentUser();
    const body = await request.json();
    const {
      boardId,
      sectionId,
      title = '',
      content = '',
      authorName,
      color = '#fef08a',
      attachment,
      posX,
      posY,
    } = body;

    if (!boardId) {
      return NextResponse.json({ error: '缺少看板 ID' }, { status: 400 });
    }

    const board = await db.getBoardByIdAsync(boardId);
    if (!board) {
      return NextResponse.json({ error: '找不到此看板' }, { status: 404 });
    }

    // 若未指定 sectionId，自動綁定至該看板的第一個主題分欄
    let effectiveSectionId = sectionId;
    if (!effectiveSectionId) {
      const existingSections = await db.getSectionsByBoardIdAsync(boardId);
      if (existingSections.length > 0) {
        effectiveSectionId = existingSections[0].id;
      }
    }

    // 檢查訪客發文權限與暱稱要求
    if (!user) {
      if (!board.allowGuest) {
        return NextResponse.json({ error: '此看板限定登入後方可發表內容' }, { status: 403 });
      }
      if (!authorName || !authorName.trim()) {
        return NextResponse.json({ error: '訪客發表必須填寫暱稱或座號' }, { status: 400 });
      }
    }

    const displayName = user ? user.name : authorName.trim();
    const isAdmin = user?.role === 'admin';
    const isBoardOwner = user?.id === board.createdBy;
    const isTeacher = user?.role === 'teacher' || isAdmin;

    // 不雅詞過濾
    let processedTitle = title.trim();
    let processedContent = content.trim();

    if (board.profanityFilter) {
      processedTitle = filterProfanity(processedTitle);
      processedContent = filterProfanity(processedContent);
    }

    // 處理媒體附件 (若未指定附件，但內文或標題包含網址，自動轉為 link 附件)
    let finalAttachment = attachment;
    if (!finalAttachment) {
      const urlsInContent = findUrls(processedContent);
      const urlsInTitle = findUrls(processedTitle);
      const detectedUrl = urlsInContent[0] || urlsInTitle[0];
      if (detectedUrl) {
        const ytId = extractYouTubeId(detectedUrl);
        finalAttachment = {
          type: 'link',
          url: detectedUrl,
          title: ytId ? 'YouTube 影片' : detectedUrl,
          metadata: ytId
            ? {
                youtubeId: ytId,
                ogImage: getYouTubeThumbnail(ytId),
              }
            : undefined,
        };
      }
    } else if (finalAttachment.type === 'link' && finalAttachment.url) {
      const ytId = extractYouTubeId(finalAttachment.url);
      if (ytId) {
        finalAttachment = {
          ...finalAttachment,
          title:
            finalAttachment.title && finalAttachment.title !== finalAttachment.url
              ? finalAttachment.title
              : 'YouTube 影片',
          metadata: {
            ...finalAttachment.metadata,
            youtubeId: ytId,
            ogImage: getYouTubeThumbnail(ytId),
          },
        };
      }
    }

    // 審核狀態：管理員或該看板老師發文免審核；學生與訪客依看板 requireApproval 決定
    const canBypassApproval = isAdmin || isBoardOwner;
    const status = board.requireApproval && !canBypassApproval ? 'pending' : 'approved';

    const newPost: Post = {
      id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      boardId,
      sectionId: effectiveSectionId,
      authorId: user?.id, // 訪客為 undefined
      authorName: displayName,
      isAuthorTeacher: isTeacher,
      title: processedTitle,
      content: processedContent,
      color,
      attachment: finalAttachment,
      status,
      orderIndex: 0,
      posX: typeof posX === 'number' ? posX : undefined,
      posY: typeof posY === 'number' ? posY : undefined,
      likeCount: 0,
      upvotes: 0,
      downvotes: 0,
      starAverage: 0,
      starCount: 0,
      commentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.createPost(newPost);
    return NextResponse.json({ success: true, post: newPost });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '發表貼文失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 編輯貼文內容或審核狀態
export async function PATCH(request: NextRequest) {
  try {
    await db.ensureHydrated();
    const user = await getCurrentUser();
    const body = await request.json();
    const { postId, status, title, content, color, attachment, sectionId, posX, posY } = body;

    if (!postId) {
      return NextResponse.json({ error: '缺少貼文 ID' }, { status: 400 });
    }

    const post = db.getPostById(postId);
    if (!post) {
      return NextResponse.json({ error: '找不到此貼文' }, { status: 404 });
    }

    const board = await db.getBoardByIdAsync(post.boardId);
    const isAdmin = user?.role === 'admin';
    const isBoardOwner = user?.id === board?.createdBy;
    const isAuthor = user && user.id === post.authorId;

    // 1. 若是審核狀態變更 (status)
    if (status) {
      if (!isAdmin && !isBoardOwner) {
        return NextResponse.json({ error: '權限不足：僅看板教師或系統管理員可審核貼文' }, { status: 403 });
      }
    }

    // 2. 若是編輯貼文內容或畫布位置 (title, content, color, attachment, sectionId, posX, posY)
    if (
      title !== undefined ||
      content !== undefined ||
      color !== undefined ||
      attachment !== undefined ||
      sectionId !== undefined ||
      posX !== undefined ||
      posY !== undefined
    ) {
      // 訪客或學生只能編輯自己發表的貼文；教師/管理員可管理
      if (!isAdmin && !isBoardOwner && !isAuthor) {
        return NextResponse.json({ error: '權限不足：您只能編輯自己發表的貼文' }, { status: 403 });
      }
    }

    const updates: Partial<Post> = {};
    if (status) updates.status = status;
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (attachment !== undefined) {
      if (attachment && attachment.type === 'link' && attachment.url) {
        const ytId = extractYouTubeId(attachment.url);
        if (ytId) {
          attachment.metadata = {
            ...attachment.metadata,
            youtubeId: ytId,
            ogImage: getYouTubeThumbnail(ytId),
          };
          if (!attachment.title || attachment.title === attachment.url) {
            attachment.title = 'YouTube 影片';
          }
        }
      }
      updates.attachment = attachment;
    }
    if (sectionId !== undefined) updates.sectionId = sectionId;
    if (posX !== undefined) updates.posX = posX;
    if (posY !== undefined) updates.posY = posY;

    const updated = await db.updatePost(postId, updates);
    return NextResponse.json({ success: true, post: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '更新貼文失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 刪除貼文
export async function DELETE(request: NextRequest) {
  try {
    await db.ensureHydrated();
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

    // 訪客（未登入者）嚴格禁止刪除任何貼文
    if (!user) {
      return NextResponse.json({ error: '訪客無權限刪除貼文，如需處理請聯絡板主老師' }, { status: 403 });
    }

    const board = await db.getBoardByIdAsync(post.boardId);
    const isAdmin = user.role === 'admin';
    const isBoardOwner = user.id === board?.createdBy;
    const isAuthor = user.id === post.authorId;

    // 權限檢查：
    // - 系統管理員：全域可刪
    // - 看板教師：可刪自己看板內任何文章（含學生的）
    // - 學生：只能刪除自己發表的文章
    if (!isAdmin && !isBoardOwner && !isAuthor) {
      return NextResponse.json({ error: '權限不足：您只能刪除自己發表的貼文' }, { status: 403 });
    }

    await db.deletePost(postId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '刪除貼文失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
