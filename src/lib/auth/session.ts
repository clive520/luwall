import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { User } from '@/types';
import { db } from '@/lib/db';

const SESSION_SECRET = process.env.SESSION_SECRET || 'luwall-secret-key-change-in-production-2026';
const COOKIE_NAME = 'luwall_session';

export async function createSessionCookie(user: User): Promise<string> {
  const token = jwt.sign(
    {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      provider: user.provider,
    },
    SESSION_SECRET,
    { expiresIn: '7d' }
  );

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 天
  });

  return token;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, SESSION_SECRET) as { id: string };
    const user = db.getUserById(decoded.id);
    return user || null;
  } catch {
    return null;
  }
}
