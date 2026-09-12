import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { LUYANG_SSO_SECRET, LUYANG_SSO_URL } from '@/lib/auth/sso';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode'); // mock-teacher, mock-student, 或直接跳轉
  const returnUrl = searchParams.get('return_url') || '/';

  // 支援本機開發快速模擬鹿陽國小學生/教師 Token
  if (mode === 'mock-teacher' || mode === 'mock-student') {
    const isTeacher = mode === 'mock-teacher';
    const mockPayload = {
      uid: isTeacher ? 'luyang-tea-101' : 'luyang-stu-202',
      username: isTeacher ? 'teacher_wang' : '113025',
      name: isTeacher ? '王大明老師' : '張小芬 (座號 25)',
      role: isTeacher ? 'teacher' : 'student',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    };

    const token = jwt.sign(mockPayload, LUYANG_SSO_SECRET, { algorithm: 'HS256' });
    const callbackUrl = new URL('/api/auth/sso/callback', request.url);
    callbackUrl.searchParams.set('token', token);
    callbackUrl.searchParams.set('return_url', returnUrl);

    return NextResponse.redirect(callbackUrl);
  }

  // 生產/正式模式導向鹿陽國小真實 SSO 認證頁面
  const myCallback = new URL('/api/auth/sso/callback', request.url).toString();
  const targetUrl = `${LUYANG_SSO_URL}?return_url=${encodeURIComponent(myCallback)}`;

  return NextResponse.redirect(targetUrl);
}
