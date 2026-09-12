import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const board = db.getBoardById(id);

  if (!board) {
    return NextResponse.json({ error: '找不到此看板' }, { status: 404 });
  }

  const user = await getCurrentUser();
  const isAdmin = user?.role === 'admin';
  const isBoardOwner = user?.id === board.createdBy;
  const isTeacher = user?.role === 'teacher';

  // 老師（該看板擁有者）或管理員可審核、看待審核貼文
  const canManage = isAdmin || (isTeacher && isBoardOwner);

  const posts = db.getPostsByBoardId(id, canManage);

  return NextResponse.json({
    board,
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

  if (!isAdmin && !isBoardOwner) {
    return NextResponse.json({ error: '權限不足：僅看板擁有者或系統管理員可修改設定' }, { status: 403 });
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

  // 系統管理員可刪除任意看板；教師僅能刪除自己開的看板
  if (!isAdmin && !isBoardOwner) {
    return NextResponse.json({ error: '權限不足：無法刪除此看板' }, { status: 403 });
  }

  db.deleteBoard(id);
  return NextResponse.json({ success: true });
}
