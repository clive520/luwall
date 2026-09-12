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
  const isOwner = user?.id === board.createdBy || user?.role === 'teacher' || user?.role === 'admin';

  // 老師或板主可看全部貼文（含待審核），訪客/學生只看 approved
  const posts = db.getPostsByBoardId(id, isOwner);

  return NextResponse.json({
    board,
    posts,
    isOwner,
    currentUser: user,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const updated = db.updateBoard(id, body);

  if (!updated) {
    return NextResponse.json({ error: '找不到此看板' }, { status: 404 });
  }

  return NextResponse.json({ success: true, board: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const success = db.deleteBoard(id);

  if (!success) {
    return NextResponse.json({ error: '找不到此看板' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
