import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { createSessionCookie } from '@/lib/auth/session';
import { User } from '@/types';

export async function POST(request: NextRequest) {
  try {
    await db.ensureHydrated();
    const body = await request.json();
    const { action, username, password, name, role = 'student', email } = body;

    if (!username || !password) {
      return NextResponse.json({ error: '請輸入帳號與密碼' }, { status: 400 });
    }

    if (action === 'register') {
      if (!name) {
        return NextResponse.json({ error: '請輸入中文姓名或暱稱' }, { status: 400 });
      }

      const existing = db.getUserByUsername(username);
      if (existing) {
        return NextResponse.json({ error: '此帳號已被註冊，請換一個' }, { status: 400 });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser: User = {
        id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        provider: 'local',
        username,
        name,
        email,
        role: 'student', // 任何人註冊，預設皆為學生身分，需由現有教師或管理員調整
        createdAt: new Date().toISOString(),
      };

      db.saveUser({ ...newUser, passwordHash });
      await createSessionCookie(newUser);

      return NextResponse.json({ success: true, user: newUser });
    } else if (action === 'login') {
      const user = db.getUserByUsername(username);
      if (!user || !user.passwordHash) {
        return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 });
      }

      const { passwordHash: _, ...safeUser } = user;
      await createSessionCookie(safeUser);

      return NextResponse.json({ success: true, user: safeUser });
    }

    return NextResponse.json({ error: '無效的操作' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '系統錯誤';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
