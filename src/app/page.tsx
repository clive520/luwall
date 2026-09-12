'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Board, User } from '@/types';
import { Navbar } from '@/components/common/Navbar';
import { CreateBoardModal } from '@/components/board/CreateBoardModal';
import {
  Plus,
  LogIn,
  Sparkles,
  ArrowRight,
  Radio,
  Layers,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export default function HomePage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 取得當前使用者
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => setCurrentUser(data.user || null));

    // 取得看板列表
    fetch('/api/boards')
      .then((res) => res.json())
      .then((data) => setBoards(data.boards || []))
      .finally(() => setLoading(false));
  }, []);

  const refreshBoards = () => {
    fetch('/api/boards')
      .then((res) => res.json())
      .then((data) => setBoards(data.boards || []));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-amber-50/30 flex flex-col">
      <Navbar onOpenCreateBoard={() => setIsCreateBoardOpen(true)} />

      {/* Hero 區域 */}
      <section className="relative overflow-hidden py-12 sm:py-16 border-b border-amber-100 bg-radial from-amber-100/40 via-transparent to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/80 border border-amber-200 text-amber-900 text-xs font-bold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>教學互動・零秒同步・免註冊即時協作</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-gray-950 tracking-tight mb-3">
            鹿鳴牆 <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">LuWall</span>
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-600 mb-8 leading-relaxed font-medium">
            「呦呦鹿鳴，食野之苹。」專為學校課堂量身設計的數位協作看板。
            學生掃描 QR Code 即可免登入立即張貼照片、3分鐘錄音與心得便籤；
            老師一鍵掌控課堂審核，全班毫秒級同步分享！
          </p>

          {/* 快捷操作按鈕 */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setIsCreateBoardOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold text-sm shadow-lg shadow-amber-600/20 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>建立新看板 🎯</span>
            </button>

            {!currentUser && (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-amber-50 text-amber-900 font-bold text-sm border border-amber-200 shadow-xs transition"
              >
                <LogIn className="w-4 h-4 text-amber-600" />
                <span>登入參與 🪪</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 看板大廳區塊 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-700" />
            <h2 className="text-xl font-black text-gray-900">課堂熱門看板</h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {boards.length} 面
            </span>
          </div>

          <button
            onClick={() => setIsCreateBoardOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增看板</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm font-medium">
            讀取看板資料中...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boards.map((b) => (
              <Link
                key={b.id}
                href={`/boards/${b.id}`}
                className="group bg-white rounded-3xl overflow-hidden border border-amber-100 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
              >
                {/* 頂部彩色裝飾條 */}
                <div className={`h-24 bg-gradient-to-r ${b.coverColor} p-4 text-white flex flex-col justify-between`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/20 backdrop-blur">
                      串流 Stream
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-white/90">
                      <Radio className="w-3 h-3 text-emerald-300 animate-pulse" />
                      即時中
                    </span>
                  </div>
                </div>

                {/* 內容介紹 */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-black text-gray-950 group-hover:text-amber-800 transition-colors mb-2 line-clamp-1">
                      {b.title}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-4">
                      {b.description || '點擊進入開始課堂即時分享與討論！'}
                    </p>
                  </div>

                  {/* 底部屬性標籤 */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                    <span className="font-semibold text-gray-700">板主：{b.creatorName}</span>
                    <div className="flex items-center gap-1.5">
                      {b.allowGuest && (
                        <span title="免登入可參與" className="text-emerald-600">
                          <UserCheck className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {b.requireApproval && (
                        <span title="開啟教師審核" className="text-amber-600">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 頁尾 */}
      <footer className="border-t border-amber-100 py-6 text-center text-xs text-gray-400">
        鹿鳴牆 LuWall © 2026 ・ 專為教育教學設計的數位協作看板系統
      </footer>

      {/* 彈窗 */}
      <CreateBoardModal
        isOpen={isCreateBoardOpen}
        onClose={() => setIsCreateBoardOpen(false)}
        onBoardCreated={refreshBoards}
      />
    </div>
  );
}
