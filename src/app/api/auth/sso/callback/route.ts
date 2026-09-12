import { NextRequest, NextResponse } from 'next/server';
import { verifyLuyangToken, syncLuyangUser } from '@/lib/auth/sso';
import { createSessionCookie } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const returnUrl = searchParams.get('return_url') || '/';

  if (!token) {
    return NextResponse.json({ error: '缺少 SSO Token' }, { status: 400 });
  }

  const verifyResult = verifyLuyangToken(token);
  if (!verifyResult.success || !verifyResult.payload) {
    return NextResponse.json(
      { error: `Token 驗證失敗: ${verifyResult.error}` },
      { status: 401 }
    );
  }

  // 同步使用者資料
  const user = syncLuyangUser(verifyResult.payload);

  // 建立 Session Cookie
  await createSessionCookie(user);

  // 重導向回應用程式頁面
  return NextResponse.redirect(new URL(returnUrl, request.url));
}
