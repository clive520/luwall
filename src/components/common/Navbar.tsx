'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { PlusCircle, LogIn, LogOut, School, Crown, GraduationCap, Briefcase, Settings } from 'lucide-react';

interface NavbarProps {
  onOpenCreateBoard?: () => void;
}

export function Navbar({ onOpenCreateBoard }: NavbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user || null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
    router.refresh();
  };

  const handleCreateBoardClick = () => {
    if (!user) {
      alert('請先登入教師或系統管理員帳號以建立新看板！');
      router.push('/login');
      return;
    }
    if (user.role !== 'teacher' && user.role !== 'admin') {
      alert('您目前的帳號身分為「學生」，開立看板需具備教師或系統管理員身分。如有需要請聯絡老師為您開板！');
      return;
    }
    if (onOpenCreateBoard) {
      onOpenCreateBoard();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-amber-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo 與品牌 */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-white shadow-md shadow-amber-200 group-hover:scale-105 transition-transform">
            <span className="text-xl">🦌</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-amber-800 to-amber-600 bg-clip-text text-transparent">
                鹿鳴牆
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                LuWall
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-none">教學互動協作看板</p>
          </div>
        </Link>

        {/* 右側操作選單 */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* 管理員專屬後台入口按鈕 */}
          {!loading && user?.role === 'admin' && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition shadow-xs"
            >
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <span>系統後台</span>
            </Link>
          )}

          {/* 新看板按鈕 */}
          {onOpenCreateBoard && (
            <button
              onClick={handleCreateBoardClick}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs sm:text-sm font-semibold shadow-xs transition ${
                user?.role === 'teacher' || user?.role === 'admin'
                  ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                  : 'bg-amber-600/80 hover:bg-amber-700'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>新看板</span>
            </button>
          )}

          {!loading && user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
                {user.role === 'admin' ? (
                  <Crown className="w-4 h-4 text-amber-600" />
                ) : user.role === 'teacher' ? (
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                ) : user.provider === 'luyang_sso' ? (
                  <School className="w-4 h-4 text-blue-600" />
                ) : (
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                )}
                <div className="text-left leading-tight">
                  <div className="text-xs font-bold text-gray-800 flex items-center gap-1">
                    <span>{user.name}</span>
                    {user.role === 'admin' ? (
                      <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-md font-extrabold">
                        管理員
                      </span>
                    ) : user.role === 'teacher' ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md font-bold">
                        教師
                      </span>
                    ) : (
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-md font-medium">
                        學生
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 block">
                    {user.provider === 'luyang_sso'
                      ? '鹿陽 SSO'
                      : user.provider === 'google'
                      ? 'Google'
                      : '帳密會員'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="登出"
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : !loading ? (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-300 text-amber-800 hover:bg-amber-50 text-xs sm:text-sm font-medium transition"
            >
              <LogIn className="w-4 h-4" />
              <span>登入 / 註冊</span>
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
