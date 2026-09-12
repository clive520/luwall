'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User as UserIcon, Lock, Mail, Tag, Loader2, Sparkles } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('兩次輸入的密碼不相符');
      return;
    }

    if (password.length < 6) {
      setError('密碼長度至少需 6 個字元');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          username,
          name,
          email,
          role,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '註冊失敗');
      }

      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '註冊失敗';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-amber-50/30 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 group mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-white shadow-lg shadow-amber-200 group-hover:scale-105 transition-transform text-2xl">
            🦌
          </div>
        </Link>
        <h2 className="text-2xl font-black text-gray-950 tracking-tight">
          註冊「鹿鳴牆 LuWall」帳號
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          建立個人帳號，隨時管理您的看板與班級活動
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl shadow-amber-900/5 rounded-3xl border border-amber-100 sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-3.5">
            {/* 帳號 */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                使用者帳號 *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="英數字，例如：student123"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl outline-hidden focus:ring-2 focus:ring-amber-500/50"
                />
                <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* 姓名 */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                中文姓名或暱稱 *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="例如：王小明"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl outline-hidden focus:ring-2 focus:ring-amber-500/50"
                />
                <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                電子信箱（選填）
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="example@school.edu.tw"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl outline-hidden focus:ring-2 focus:ring-amber-500/50"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* 身分 */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                身分類型
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                    role === 'student'
                      ? 'border-amber-600 bg-amber-50 text-amber-900'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  🎓 學生
                </button>
                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                    role === 'teacher'
                      ? 'border-amber-600 bg-amber-50 text-amber-900'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  🧑‍🏫 教師 (具開板權限)
                </button>
              </div>
            </div>

            {/* 密碼 */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                設定密碼 * (至少 6 碼)
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="輸入密碼"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl outline-hidden focus:ring-2 focus:ring-amber-500/50"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* 確認密碼 */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                確認密碼 *
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="再次輸入密碼"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl outline-hidden focus:ring-2 focus:ring-amber-500/50"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold text-xs shadow-xs transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>建立帳號中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>完成註冊並登入</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            已經有帳號了？{' '}
            <Link href="/login" className="font-bold text-amber-600 hover:text-amber-700">
              返回登入頁
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
