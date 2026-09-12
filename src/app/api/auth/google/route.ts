import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { createSessionCookie } from '@/lib/auth/session';
import { User } from '@/types';

// 支援 Google OAuth 登入
export async function POST(request: NextRequest) {
  try {
    await db.ensureHydrated();
    const body = await request.json();
    const { email, name, avatarUrl, authUserId } = body;

    const userEmail = (email || 'user@gmail.com').trim().toLowerCase();
    const userName = name || 'Google 使用者';

    // 1. 優先以完整 email 查找是否已有該帳號（最精準，徹底區分不同網域相同前綴的帳號）
    let user = db.getUserByEmail(userEmail);

    // 2. 若 email 查不到，再以 authUserId 查找
    if (!user && authUserId) {
      user = db.getUserById(`google-${authUserId}`);
    }

    if (!user) {
      // 產生專屬唯一的 userId（若有 Supabase Auth ID 則以其為準，否則取完整 Email 的 SHA256）
      const hash = crypto.createHash('sha256').update(userEmail).digest('hex').substring(0, 16);
      const userId = authUserId ? `google-${authUserId}` : `google-${hash}`;

      // 產生不會與現有帳號衝突的 username
      const emailPrefix = userEmail.split('@')[0] || 'user';
      const emailDomain = userEmail.split('@')[1]?.split('.')[0] || '';

      let candidateUsername = emailPrefix;
      const existingUserWithUsername = db.getUserByUsername(candidateUsername);
      if (existingUserWithUsername && existingUserWithUsername.id !== userId) {
        // 如果同名前綴已被其他帳號使用（例如不同網域），加入網域辨識以利區分
        candidateUsername = emailDomain ? `${emailPrefix}_${emailDomain}` : `${emailPrefix}_${hash.substring(0, 4)}`;
        if (db.getUserByUsername(candidateUsername)) {
          candidateUsername = `${emailPrefix}_${hash.substring(0, 6)}`;
        }
      }

      user = {
        id: userId,
        provider: 'google',
        username: candidateUsername,
        name: userName,
        email: userEmail,
        avatarUrl,
        role: 'student', // 任何人登入之後，預設都是學生身分
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
      if (!user.email || user.email.toLowerCase() !== userEmail) {
        user.email = userEmail;
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
