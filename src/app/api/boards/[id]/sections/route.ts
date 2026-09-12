import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { Section } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await db.ensureHydrated();
  const { id } = await params;
  const sections = await db.getSectionsByBoardIdAsync(id);
  return NextResponse.json({ sections });
}

export async function POST(
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
    const isBoardOwner = user?.id === board.createdBy;

    if (!isAdmin && !isBoardOwner) {
      return NextResponse.json({ error: '權限不足：僅看板教師或系統管理員可新增主題欄位' }, { status: 403 });
    }

    const body = await request.json();
    const { title } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: '請輸入主題名稱' }, { status: 400 });
    }

    const existing = await db.getSectionsByBoardIdAsync(id);
    const newSection: Section = {
      id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      boardId: id,
      title: title.trim(),
      orderIndex: existing.length,
      createdAt: new Date().toISOString(),
    };

    await db.createSection(newSection);
    return NextResponse.json({ success: true, section: newSection });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '建立主題失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await db.ensureHydrated();
    const { id } = await params;
    const user = await getCurrentUser();
    const board = await db.getBoardByIdAsync(id);

    const isAdmin = user?.role === 'admin';
    const isBoardOwner = user?.id === board?.createdBy;

    if (!isAdmin && !isBoardOwner) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 });
    }

    const body = await request.json();
    const { sectionId, title } = body;

    if (!sectionId || !title || !title.trim()) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    const updated = await db.updateSection(sectionId, title);
    return NextResponse.json({ success: true, section: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '更新主題失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await db.ensureHydrated();
    const { id } = await params;
    const user = await getCurrentUser();
    const board = await db.getBoardByIdAsync(id);

    const isAdmin = user?.role === 'admin';
    const isBoardOwner = user?.id === board?.createdBy;

    if (!isAdmin && !isBoardOwner) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId');

    if (!sectionId) {
      return NextResponse.json({ error: '缺少主題 ID' }, { status: 400 });
    }

    // 檢查是否只剩一個主題，避免全部刪空
    const sections = await db.getSectionsByBoardIdAsync(id);
    if (sections.length <= 1) {
      return NextResponse.json({ error: '至少需要保留一個主題欄位' }, { status: 400 });
    }

    await db.deleteSection(sectionId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '刪除主題失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
