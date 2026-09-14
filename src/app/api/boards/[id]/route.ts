import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { deleteFromR2, isR2Url } from '@/lib/storage/r2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await db.ensureHydrated();
  const { id } = await params;
  const board = await db.getBoardByIdAsync(id);

  if (!board) {
    return NextResponse.json({ error: '找不到此看板' }, { status: 404 });
  }

  const user = await getCurrentUser();
  const isAdmin = user?.role === 'admin';
  const isBoardOwner = Boolean(user && user.id === board.createdBy);
  const isTeacher = user?.role === 'teacher';

  // 審核權限：嚴格限定只有看板的主人（成立看板的老師）或系統管理員才能看到與審核待審核貼文
  const canReview = isBoardOwner || isAdmin;
  // 看板擁有權：嚴格限定為開設此看板的人 (或系統管理員)
  const isOwner = isBoardOwner || isAdmin;

  // 若為私人看板且未登入，限制瀏覽
  if (board.isPublic === false && !user) {
    return NextResponse.json(
      {
        board: {
          id: board.id,
          title: board.title,
          description: board.description,
          coverColor: board.coverColor,
          isPublic: false,
          creatorName: board.creatorName,
        },
        isRestricted: true,
        error: '此看板僅限校內師生登入後檢視',
        sections: [],
        posts: [],
        isOwner: false,
        canReview: false,
        currentUser: null,
      },
      { status: 403 }
    );
  }

  // 支援訪客暫存貼文 ID (讓未登入訪客也能在審核中看見自己發布的便籤)
  const guestPostsParam = request.nextUrl.searchParams.get('guestPosts');
  const guestPostIds = guestPostsParam ? guestPostsParam.split(',').filter(Boolean) : [];

  // 教師/管理員可見所有貼文（含待審核）；學生可見已核准貼文 + 自己的待審核便籤
  const posts = await db.getPostsByBoardIdAsync(id, canReview, user?.id, guestPostIds);
  const sections = await db.getSectionsByBoardIdAsync(id);

  return NextResponse.json({
    board,
    sections,
    posts,
    isOwner,
    canReview,
    currentUser: user,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await db.ensureHydrated();
  const { id } = await params;
  const user = await getCurrentUser();

  const board = await db.getBoardByIdAsync(id);
  if (!board) {
    return NextResponse.json({ error: '找不到此看板' }, { status: 404 });
  }

  const isAdmin = user?.role === 'admin';
  const isBoardOwner = Boolean(user && user.id === board.createdBy);

  // 僅該看板的開設者或超級管理員具備修改設定權限
  if (!isAdmin && !isBoardOwner) {
    return NextResponse.json({ error: '權限不足：僅該看板擁有者或系統管理員可修改設定' }, { status: 403 });
  }

  const body = await request.json();
  const updated = await db.updateBoard(id, body);

  return NextResponse.json({ success: true, board: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await db.ensureHydrated();
  const { id } = await params;
  const user = await getCurrentUser();

  const board = await db.getBoardByIdAsync(id);
  if (!board) {
    return NextResponse.json({ error: '找不到此看板' }, { status: 404 });
  }

  const isAdmin = user?.role === 'admin';
  const isBoardOwner = Boolean(user && user.id === board.createdBy);

  // 僅該看板的開設者或超級管理員具備刪除權限
  if (!isAdmin && !isBoardOwner) {
    return NextResponse.json({ error: '權限不足：僅該看板擁有者或系統管理員可刪除此看板' }, { status: 403 });
  }

  // 刪除此看板內所有貼文已上傳至 R2 的附件檔案
  try {
    const posts = await db.getPostsByBoardIdAsync(id, true);
    await Promise.all(
      posts
        .filter((p) => p.attachment?.url && isR2Url(p.attachment.url))
        .map((p) => deleteFromR2(p.attachment!.url))
    );
  } catch (err) {
    console.warn(`[Board DELETE] 清理看板 ${id} 附件時發生錯誤:`, err);
  }

  await db.deleteBoard(id);
  return NextResponse.json({ success: true });
}

