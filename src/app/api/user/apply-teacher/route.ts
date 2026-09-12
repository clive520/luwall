import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

// 取得當前使用者的教師申請狀態
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  return NextResponse.json({
    role: user.role,
    status: user.teacherApplicationStatus || 'none',
    reason: user.teacherApplicationReason || '',
    appliedAt: user.teacherAppliedAt || null,
  });
}

// 學生提出教師身分申請
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '請先登入後再申請' }, { status: 401 });
  }

  if (user.role === 'teacher' || user.role === 'admin') {
    return NextResponse.json({ error: '您已具備教師或管理員身分，無需重複申請' }, { status: 400 });
  }

  if (user.teacherApplicationStatus === 'pending') {
    return NextResponse.json({ error: '您的申請已在審查中，請靜候管理者核定' }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    const updated = db.applyTeacherRole(user.id, reason);
    if (!updated) {
      return NextResponse.json({ error: '找不到該使用者' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '申請失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
