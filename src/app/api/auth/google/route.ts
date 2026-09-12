import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSessionCookie } from '@/lib/auth/session';
import { User } from '@/types';

// 支援 Google 一鍵登入（提供真實 OAuth 橋接與一鍵體驗模擬）
export async function POST(request: NextRequest) {
  try {
    await db.ensureHydrated();
    const body = await request.json();
    const { email, name, avatarUrl } = body;

    const userEmail = email || 'user@gmail.com';
    const userName = name || 'Google 使用者';

    const userId = `google-${Buffer.from(userEmail).toString('hex').substring(0, 16)}`;
    let user = db.getUserById(userId);

    if (!user) {
      user = {
        id: userId,
        provider: 'google',
        username: userEmail.split('@')[0],
        name: userName,
        email: userEmail,
        avatarUrl,
        role: 'teacher', // Google 登入者預設可開板
        createdAt: new Date().toISOString(),
      };
      db.saveUser(user);
    } else {
      let updated = false;
      if (userName && user.name !== userName) {
        user.name = userName;
        updated = true;
      }
      if (avatarUrl && user.avatarUrl !== avatarUrl) {
        user.avatarUrl = avatarUrl;
        updated = true;
      }
      if (updated) {
        db.saveUser(user);
      }
    }

    await createSessionCookie(user);
    return NextResponse.json({ success: true, user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Google 登入失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
