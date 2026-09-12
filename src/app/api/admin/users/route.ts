import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { UserRole } from '@/types';

// 檢驗是否為管理員
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return null;
  }
  return user;
}

// 取得所有使用者列表
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: '權限不足：僅系統管理員可存取' }, { status: 403 });
  }

  const users = db.getUsers().map(({ passwordHash: _, ...safeUser }) => safeUser);
  return NextResponse.json({ users });
}

// 修改使用者身分角色（核定誰是教師、誰是系統管理員）
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: '權限不足：僅系統管理員可操作' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, role } = body as { userId: string; role: UserRole };

    if (!userId || !role) {
      return NextResponse.json({ error: '缺少參數' }, { status: 400 });
    }

    if (!['admin', 'teacher', 'student'].includes(role)) {
      return NextResponse.json({ error: '無效的身分角色' }, { status: 400 });
    }

    const targetUser = db.getUserById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: '找不到該使用者' }, { status: 404 });
    }

    // 防止唯一的管理員降級自己造成系統無管理員
    if (targetUser.id === admin.id && role !== 'admin') {
      const allAdmins = db.getUsers().filter((u) => u.role === 'admin');
      if (allAdmins.length <= 1) {
        return NextResponse.json({ error: '無法降級最後一位系統管理員' }, { status: 400 });
      }
    }

    const updated = db.updateUserRole(userId, role);
    return NextResponse.json({ success: true, user: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '更新身分失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 刪除 / 註銷使用者帳號
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: '權限不足：僅系統管理員可操作' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: '缺少使用者 ID' }, { status: 400 });
    }

    if (userId === admin.id) {
      return NextResponse.json({ error: '不可刪除自己的管理員帳號' }, { status: 400 });
    }

    const success = db.deleteUser(userId);
    if (!success) {
      return NextResponse.json({ error: '找不到該使用者' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '刪除失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
