import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await db.ensureHydrated();
  const { id } = await params;
  const board = db.getBoardById(id);

  if (!board) {
    return NextResponse.json({ error: '找不到此看板' }, { status: 404 });
  }

  const user = await getCurrentUser();
  const isAdmin = user?.role === 'admin';
  const isBoardOwner = user?.id === board.createdBy;
  const isTeacher = user?.role === 'teacher';

  // 老師或管理員可審核與管理
  const canManage = isAdmin || isBoardOwner || isTeacher;

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
        currentUser: null,
      },
      { status: 403 }
    );
  }

  const posts = db.getPostsByBoardId(id, canManage);
  const sections = db.getSectionsByBoardId(id);

  return NextResponse.json({
    board,
    sections,
    posts,
    isOwner: canManage,
    currentUser: user,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  const board = db.getBoardById(id);
  if (!board) {
    return NextResponse.json({ error: '找不到此看板' }, { status: 404 });
  }

  const isAdmin = user?.role === 'admin';
  const isBoardOwner = user?.id === board.createdBy;
  const isTeacher = user?.role === 'teacher';

  if (!isAdmin && !isBoardOwner && !isTeacher) {
    return NextResponse.json({ error: '權限不足：僅教師或系統管理員可修改設定' }, { status: 403 });
  }

  const body = await request.json();
  const updated = db.updateBoard(id, body);

  return NextResponse.json({ success: true, board: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  const board = db.getBoardById(id);
  if (!board) {
    return NextResponse.json({ error: '找不到此看板' }, { status: 404 });
  }

  const isAdmin = user?.role === 'admin';
  const isBoardOwner = user?.id === board.createdBy;
  const isTeacher = user?.role === 'teacher';

  // 系統管理員或教師可刪除看板
  if (!isAdmin && !isBoardOwner && !isTeacher) {
    return NextResponse.json({ error: '權限不足：無法刪除此看板' }, { status: 403 });
  }

  db.deleteBoard(id);
  return NextResponse.json({ success: true });
}
