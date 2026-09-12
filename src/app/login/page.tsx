'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { User as UserIcon, Lock, Loader2 } from 'lucide-react';
import { getBrowserSupabase } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('return_url') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 一般帳密登入
  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, action: 'login' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '登入失敗');

      router.push(returnUrl);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登入失敗');
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth 真正登入（透過 Supabase OAuth 連線）
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getBrowserSupabase();
      if (!supabase) {
        setError('系統未配置 Google OAuth 憑證，請先使用帳號密碼登入');
        setLoading(false);
        return;
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (oauthError) {
        setError(oauthError.message || 'Google 登入啟動失敗');
        setLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google 登入連線失敗');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white py-8 px-6 shadow-xl shadow-amber-900/5 rounded-3xl border border-amber-100 sm:px-10">
      {error && (
        <div className="mb-5 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-600">
          {error}
        </div>
      )}

      {/* 登入方式一：Google 帳號登入 */}
      <div className="mb-5">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl border-2 border-gray-200 hover:border-amber-400 bg-white hover:bg-amber-50/40 text-gray-800 text-xs font-bold shadow-xs transition disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>使用 Google 帳號登入</span>
        </button>
      </div>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-white text-gray-500 font-bold">
            或使用帳號密碼登入
          </span>
        </div>
      </div>

      {/* 第三區：自建帳號密碼登入 */}
      <form onSubmit={handleLocalLogin} className="space-y-3.5">
        <div>
          <label className="block text-xs font-black text-gray-900 mb-1">
            帳號
          </label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="輸入帳號"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm font-bold bg-white text-gray-950 placeholder:text-gray-500 border-2 border-gray-300 rounded-xl outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200 shadow-2xs"
            />
            <UserIcon className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black text-gray-900 mb-1">
            密碼
          </label>
          <div className="relative">
            <input
              type="password"
              required
              placeholder="輸入密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm font-bold bg-white text-gray-950 placeholder:text-gray-500 border-2 border-gray-300 rounded-xl outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200 shadow-2xs"
            />
            <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold text-xs shadow-xs transition disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>登入中...</span>
            </>
          ) : (
            <span>登入鹿鳴牆</span>
          )}
        </button>
      </form>

      {/* 註冊導向 */}
      <div className="mt-6 text-center text-xs text-gray-500">
        還沒有帳號嗎？{' '}
        <Link href="/register" className="font-bold text-amber-600 hover:text-amber-700">
          立即註冊新帳號
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-amber-50/30 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 group mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-white shadow-lg shadow-amber-200 group-hover:scale-105 transition-transform text-2xl">
            🦌
          </div>
        </Link>
        <h2 className="text-2xl font-black text-gray-950 tracking-tight">
          登入「鹿鳴牆 LuWall」
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          選擇登入方式，開始與班級同學即時互動交流
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Suspense fallback={<div className="text-center py-10 text-gray-400">載入登入介面中...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
