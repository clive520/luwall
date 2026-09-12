import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { Board } from '@/types';

export async function GET() {
  const boards = db.getBoards();
  return NextResponse.json({ boards });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    // 嚴格權限檢查：僅教師與系統管理員可建立看板
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json(
        { error: '權限不足：僅教師與系統管理員具備開立看板的權限' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description = '',
      coverColor = 'from-emerald-500 to-teal-700',
      layoutType = 'stream',
      allowGuest = true,
      requireApproval = false,
      reactionType = 'like',
      profanityFilter = true,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: '請輸入看板標題' }, { status: 400 });
    }

    const newBoard: Board = {
      id: `board-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      description: description.trim(),
      coverColor,
      layoutType,
      allowGuest: Boolean(allowGuest),
      requireApproval: Boolean(requireApproval),
      reactionType,
      profanityFilter: Boolean(profanityFilter),
      createdBy: user.id,
      creatorName: user.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.createBoard(newBoard);
    return NextResponse.json({ success: true, board: newBoard });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '建立看板失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
