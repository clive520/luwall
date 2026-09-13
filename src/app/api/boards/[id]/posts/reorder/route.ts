import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await db.ensureHydrated();
    const { id } = await params;
    const user = await getCurrentUser();
    const board = await db.getBoardByIdAsync(id);

    if (!board) {
      return NextResponse.json({ error: '找不到此看板' }, { status: 404 });
    }

    const isAdmin = user?.role === 'admin';
    const isBoardOwner = user?.id === board?.createdBy;
    const isTeacher = isBoardOwner || user?.role === 'teacher' || isAdmin;

    if (!isAdmin && !isBoardOwner && !isTeacher && !user) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 });
    }

    const body = await request.json();
    const { reorderedPosts } = body;

    if (!Array.isArray(reorderedPosts) || reorderedPosts.length === 0) {
      return NextResponse.json({ error: '缺少排序資料' }, { status: 400 });
    }

    await db.reorderPosts(id, reorderedPosts);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '更新排序失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
