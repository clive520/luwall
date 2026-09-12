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

// 檢驗是否為教師或管理員（具備檢視與核定成員身分之權限）
async function requireTeacherOrAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return null;
  }
  return user;
}

// 取得所有使用者列表（教師與管理員皆可存取）
export async function GET() {
  const operator = await requireTeacherOrAdmin();
  if (!operator) {
    return NextResponse.json({ error: '權限不足：僅教師與系統管理員可存取' }, { status: 403 });
  }

  const users = db.getUsers().map(({ passwordHash: _, ...safeUser }) => safeUser);
  return NextResponse.json({ users });
}

// 修改使用者身分角色（教師與管理員可核定/變更為教師、學生或管理員）
export async function PATCH(request: NextRequest) {
  const operator = await requireTeacherOrAdmin();
  if (!operator) {
    return NextResponse.json({ error: '權限不足：僅教師與系統管理員可操作' }, { status: 403 });
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

    // 1. 自己不能核定自己的身分
    if (targetUser.id === operator.id) {
      return NextResponse.json({ error: '安全限制：自己不能核定或變更自己的身分' }, { status: 403 });
    }

    // 2. 老師的權限規則：
    // - 老師不能夠核定系統管理人員的身分
    // - 老師只能把學生核定為老師
    if (operator.role === 'teacher') {
      if (targetUser.role === 'admin' || role === 'admin') {
        return NextResponse.json(
          { error: '權限不足：老師不能夠核定系統管理人員的身分' },
          { status: 403 }
        );
      }
      if (targetUser.role !== 'student' || role !== 'teacher') {
        return NextResponse.json(
          { error: '權限不足：老師只能把學生核定為老師' },
          { status: 403 }
        );
      }
    }

    // 3. 系統管理員的權限規則：
    // - 系統管理人員可以核定老師跟學生的身份
    // - 防止最後一位管理員被降級
    if (operator.role === 'admin') {
      if (targetUser.role === 'admin' && role !== 'admin') {
        const allAdmins = db.getUsers().filter((u) => u.role === 'admin');
        if (allAdmins.length <= 1) {
          return NextResponse.json({ error: '無法降級最後一位系統管理員' }, { status: 400 });
        }
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
