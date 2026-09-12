import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/db';
import { createSessionCookie } from '@/lib/auth/session';
import { User } from '@/types';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      const authUser = data.user;
      const email = authUser.email || 'user@gmail.com';
      const name =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        email.split('@')[0];
      const avatarUrl = authUser.user_metadata?.avatar_url || null;

      const userId = 'google-' + (authUser.id || Buffer.from(email).toString('hex').substring(0, 16));

      await db.ensureHydrated();
      let user = db.getUserById(userId);

      if (!user) {
        user = {
          id: userId,
          provider: 'google',
          username: email.split('@')[0],
          name: name,
          email: email,
          avatarUrl: avatarUrl,
          role: 'teacher', // Google 登入預設具備教師開板權限
          createdAt: new Date().toISOString(),
        };
        db.saveUser(user);
      } else if (name && user.name !== name) {
        user.name = name;
        if (avatarUrl) user.avatarUrl = avatarUrl;
        db.saveUser(user);
      }

      await createSessionCookie(user);
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
