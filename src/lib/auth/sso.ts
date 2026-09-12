import jwt from 'jsonwebtoken';
import { LuyangSSOPayload, User, UserRole } from '@/types';
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
 * 完全依照 SSO Token 內的 role 欄位決定身分 (admin / teacher / student)
 */
export function syncLuyangUser(payload: LuyangSSOPayload): User {
  const existingUser = db.getUserById(payload.uid);

  // 1. 若資料庫原先已存在此人，且曾被系統管理員在後台人工核定過身分，則尊重管理員核定結果
  // 2. 若為初次登入，完全忠實讀取鹿陽 SSO 的 role 欄位
  let role: UserRole = 'student';
  if (payload.role === 'admin') {
    role = 'admin';
  } else if (payload.role === 'teacher') {
    role = 'teacher';
  } else {
    role = 'student';
  }

  // 若資料庫曾有記錄且非初次建立，可優先依據管理員設定
  const finalRole: UserRole = existingUser?.role || role;

  const userData: User = {
    id: payload.uid,
    provider: 'luyang_sso',
    username: payload.username,
    name: payload.name,
    role: finalRole,
    createdAt: existingUser?.createdAt || new Date().toISOString(),
  };

  db.saveUser(userData);
  return userData;
}
