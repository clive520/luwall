'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('正在驗證 Google 授權資訊...');

  useEffect(() => {
    let handled = false;

    async function finishLogin(user: { email?: string; user_metadata?: Record<string, any> }) {
      if (handled) return;
      handled = true;
      setStatus('登入成功，正在為您同步個人資料...');

      const email = user.email || 'user@gmail.com';
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.user_metadata?.preferred_username ||
        email.split('@')[0] ||
        'Google 老師';
      const avatarUrl = user.user_metadata?.avatar_url || null;

      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, avatarUrl }),
        });

        if (res.ok) {
          window.location.href = '/';
        } else {
          router.replace('/login?error=sync_failed');
        }
      } catch {
        router.replace('/login?error=sync_failed');
      }
    }

    async function handleAuth() {
      try {
        const supabase = getBrowserSupabase();
        if (!supabase) {
          router.replace('/login?error=no_client');
          return;
        }

        // 1. 若 URL query 中帶有 PKCE code，先在瀏覽器端進行交換
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code) {
          setStatus('正在向 Google 交換登入金鑰...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data?.session?.user) {
            await finishLogin(data.session.user);
            return;
          }
        }

        // 2. 檢查目前是否已有有效 Session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await finishLogin(session.user);
          return;
        }

        // 3. 監聽 onAuthStateChange（針對 OAuth Hash 模式）
        const { data: authSub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if ((event === 'SIGNED_IN' || newSession) && newSession?.user) {
            authSub.subscription.unsubscribe();
            await finishLogin(newSession.user);
          }
        });

        // 5 秒逾時保護
        setTimeout(() => {
          if (!handled) {
            router.replace('/login?error=timeout');
          }
        }, 5000);
      } catch (err) {
        console.error('Auth callback failed:', err);
        router.replace('/login?error=exception');
      }
    }

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-amber-50/50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-amber-200 text-center max-w-sm w-full flex flex-col items-center">
        <Loader2 className="w-10 h-10 text-amber-600 animate-spin mb-4" />
        <h2 className="text-base font-black text-gray-900 mb-2">Google 登入驗證中</h2>
        <p className="text-xs font-bold text-gray-500">{status}</p>
      </div>
    </div>
  );
}
