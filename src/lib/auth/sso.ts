import jwt from 'jsonwebtoken';
import { LuyangSSOPayload, User } from '@/types';
import { db } from '@/lib/db';

export const LUYANG_SSO_SECRET =
  process.env.LUYANG_SSO_SECRET ||
  '08bc38df41c2e5e557a95554faab585f9878ca4554993c906689fcf8082051420534d15d9fba9d751d3da2a2b08d9f14';

export const LUYANG_SSO_URL = 'https://sso-auth-system.web.app/';

/**
 * 驗證鹿陽國小 SSO 發送的 JWT Token
 */
export function verifyLuyangToken(token: string): { success: boolean; payload?: LuyangSSOPayload; error?: string } {
  try {
    const decoded = jwt.verify(token, LUYANG_SSO_SECRET, {
      algorithms: ['HS256'],
    }) as LuyangSSOPayload;

    return { success: true, payload: decoded };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Token verification failed';
    return { success: false, error: message };
  }
}

/**
 * 將鹿陽 SSO 驗證成功的 payload 轉換或同步為本系統 User
 */
export function syncLuyangUser(payload: LuyangSSOPayload): User {
  const existingUser = db.getUserById(payload.uid);

  const userData: User = {
    id: payload.uid,
    provider: 'luyang_sso',
    username: payload.username,
    name: payload.name,
    role: payload.role || 'student',
    createdAt: existingUser?.createdAt || new Date().toISOString(),
  };

  db.saveUser(userData);
  return userData;
}
