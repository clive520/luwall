'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { ThemeSwitcher } from './ThemeSwitcher';
import { ApplyTeacherModal } from './ApplyTeacherModal';
import { PlusCircle, LogIn, LogOut, School, Crown, GraduationCap, Briefcase, Clock, Bell } from 'lucide-react';

interface NavbarProps {
  onOpenCreateBoard?: () => void;
}

export function Navbar({ onOpenCreateBoard }: NavbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        const u = data.user || null;
        setUser(u);
        if (u && (u.role === 'admin' || u.role === 'teacher')) {
          fetch('/api/admin/users')
            .then((r) => r.json())
            .then((userData) => {
              if (userData.users) {
                const pending = userData.users.filter((item: User) => item.teacherApplicationStatus === 'pending');
                setPendingReviewCount(pending.length);
              }
            })
            .catch(() => {});
        }
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
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-gray-200 dark:border-slate-800 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo 與品牌 */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-white shadow-md shadow-amber-200 group-hover:scale-105 transition-transform">
            <span className="text-xl">🦌</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-amber-800 to-amber-600 dark:from-amber-400 dark:to-yellow-400 bg-clip-text text-transparent">
                鹿鳴牆
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                LuWall
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-none">教學互動協作看板</p>
          </div>
        </Link>

        {/* 右側操作選單 */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 🎨 五大視覺主題切換器 */}
          <ThemeSwitcher />

          {/* 教師與管理員身分管理入口按鈕 */}
          {!loading && (user?.role === 'admin' || user?.role === 'teacher') && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition shadow-xs relative"
              title={user.role === 'admin' ? '系統與成員後台' : '成員身分核定與管理'}
            >
              {user.role === 'admin' ? (
                <Crown className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span className="hidden sm:inline">
                {user.role === 'admin' ? '系統後台' : '身分管理'}
              </span>
              {pendingReviewCount > 0 && (
                <span
                  title={`${pendingReviewCount} 件教師資格申請待審核`}
                  className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black bg-red-500 text-white rounded-full leading-none animate-pulse shadow-xs"
                >
                  {pendingReviewCount}
                </span>
              )}
            </Link>
          )}

          {/* 學生申請成為教師按鈕 */}
          {!loading && user?.role === 'student' && (
            <button
              onClick={() => setApplyModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                user.teacherApplicationStatus === 'pending'
                  ? 'bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
                  : user.teacherApplicationStatus === 'rejected'
                  ? 'bg-red-50 hover:bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white'
              }`}
              title="申請晉升為教師身分"
            >
              {user.teacherApplicationStatus === 'pending' ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span>資格審核中</span>
                </>
              ) : (
                <>
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>{user.teacherApplicationStatus === 'rejected' ? '重新申請教師' : '申請為老師'}</span>
                </>
              )}
            </button>
          )}

          {/* 新看板按鈕：僅教師與系統管理員可見，訪客與學生不可見 */}
          {!loading && (user?.role === 'teacher' || user?.role === 'admin') && onOpenCreateBoard && (
            <button
              onClick={handleCreateBoardClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs sm:text-sm font-semibold shadow-xs transition bg-amber-600 hover:bg-amber-700 active:bg-amber-800"
            >
              <PlusCircle className="w-4 h-4" />
              <span>新看板</span>
            </button>
          )}

          {!loading && user ? (
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-slate-800 border border-amber-200 dark:border-slate-700">
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
                  <div className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                    <span>{user.name}</span>
                    {user.role === 'admin' ? (
                      <span className="text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 px-1 rounded-md font-extrabold">
                        管理員
                      </span>
                    ) : user.role === 'teacher' ? (
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1 rounded-md font-bold">
                        教師
                      </span>
                    ) : (
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-1 rounded-md font-medium">
                        學生
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="登出"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : !loading ? (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-600 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-medium transition"
            >
              <LogIn className="w-4 h-4" />
              <span>登入</span>
            </Link>
          ) : null}
        </div>
      </div>

      {user && (
        <ApplyTeacherModal
          isOpen={applyModalOpen}
          onClose={() => setApplyModalOpen(false)}
          currentUser={user}
          onApplicationUpdated={(updatedUser) => {
            setUser(updatedUser);
          }}
        />
      )}
    </header>
  );
}
