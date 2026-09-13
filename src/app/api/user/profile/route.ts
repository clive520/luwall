import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { getCurrentUser, createSessionCookie } from '@/lib/auth/session';

export async function GET() {
  try {
    await db.ensureHydrated();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: '請先登入帳號' }, { status: 401 });
    }
    return NextResponse.json({ success: true, user: currentUser });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '取得會員資料失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await db.ensureHydrated();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: '請先登入帳號' }, { status: 401 });
    }

    const body = await request.json();
    const { name, currentPassword, newPassword, confirmPassword } = body;

    // 1. 驗證暱稱 / 姓名
    let trimmedName: string | undefined = undefined;
    if (name !== undefined) {
      trimmedName = typeof name === 'string' ? name.trim() : '';
      if (!trimmedName) {
        return NextResponse.json({ error: '顯示暱稱不可為空白' }, { status: 400 });
      }
      if (trimmedName.length > 50) {
        return NextResponse.json({ error: '暱稱長度請勿超過 50 個字元' }, { status: 400 });
      }
    }

    // 2. 驗證密碼修改需求
    let newPasswordHash: string | undefined = undefined;
    const isAttemptingPasswordChange = Boolean(newPassword || currentPassword);

    if (isAttemptingPasswordChange) {
      // 🔒 針對 Google 或 SSO 登入的使用者：嚴格禁止修改密碼
      if (currentUser.provider === 'google') {
        return NextResponse.json(
          { error: '您是透過 Google 帳號登入，密碼由 Google 統一安全防護，在此無法修改密碼，僅可自訂顯示暱稱！' },
          { status: 400 }
        );
      }

      if (currentUser.provider === 'luyang_sso') {
        return NextResponse.json(
          { error: '您是透過校園 SSO 帳號登入，密碼由學校入口網統一管理，在此無法修改密碼，僅可自訂顯示暱稱！' },
          { status: 400 }
        );
      }

      // 一般本地帳號 (provider === 'local')
      if (!currentPassword) {
        return NextResponse.json({ error: '修改密碼時，請輸入目前密碼' }, { status: 400 });
      }

      if (!newPassword) {
        return NextResponse.json({ error: '請輸入新密碼' }, { status: 400 });
      }

      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return NextResponse.json({ error: '新密碼長度需至少 6 個字元' }, { status: 400 });
      }

      if (confirmPassword !== undefined && newPassword !== confirmPassword) {
        return NextResponse.json({ error: '兩次輸入的新密碼不相符，請重新確認' }, { status: 400 });
      }

      // 取得具有 passwordHash 的完整使用者資料進行校驗
      const fullUser = db.getUserById(currentUser.id);
      if (!fullUser || !fullUser.passwordHash) {
        return NextResponse.json({ error: '此帳號尚未建立本地密碼' }, { status: 400 });
      }

      const isCurrentPasswordCorrect = await bcrypt.compare(currentPassword, fullUser.passwordHash);
      if (!isCurrentPasswordCorrect) {
        return NextResponse.json({ error: '目前密碼不正確，請重新輸入' }, { status: 400 });
      }

      newPasswordHash = await bcrypt.hash(newPassword, 10);
    }

    // 若暱稱與密碼皆未進行任何變更
    if (trimmedName === undefined && newPasswordHash === undefined) {
      return NextResponse.json({ error: '未提供任何欲更新的資料' }, { status: 400 });
    }

    // 3. 執行更新
    const updatedUser = db.updateUserProfile(currentUser.id, {
      name: trimmedName,
      passwordHash: newPasswordHash,
    });

    if (!updatedUser) {
      return NextResponse.json({ error: '更新失敗：找不到該使用者' }, { status: 404 });
    }

    // 4. 更新 Session Cookie
    const { passwordHash: _, ...safeUser } = updatedUser;
    await createSessionCookie(safeUser);

    return NextResponse.json({
      success: true,
      user: safeUser,
      message: isAttemptingPasswordChange
        ? '個人資料與密碼已成功更新！'
        : '個人顯示暱稱已成功更新！',
    });
  } catch (err: unknown) {
    console.error('更新會員資料失敗:', err);
    const msg = err instanceof Error ? err.message : '更新會員資料時發生伺服器錯誤';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
