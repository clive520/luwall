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
  Star,
  Flame,
} from 'lucide-react';

function BoardCard({ board, isMyBoard }: { board: Board; isMyBoard?: boolean }) {
  return (
    <Link
      href={`/boards/${board.id}`}
      className="group bg-white rounded-3xl overflow-hidden border border-amber-100/90 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
    >
      {/* 頂部彩色裝飾條 */}
      <div className={`h-24 bg-gradient-to-r ${board.coverColor} p-4 text-white flex flex-col justify-between relative`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/20 backdrop-blur">
              串流 Stream
            </span>
            {isMyBoard && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-400 text-amber-950 flex items-center gap-1 shadow-xs">
                <Star className="w-2.5 h-2.5 fill-amber-950" />
                我的看板
              </span>
            )}
            {!board.isPublic && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-900/60 text-white backdrop-blur flex items-center gap-1 shadow-xs">
                🔒 校內限定
              </span>
            )}
          </div>
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
            {board.title}
          </h3>
          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-4">
            {board.description || '點擊進入開始課堂即時分享與討論！'}
          </p>
        </div>

        {/* 底部屬性標籤 */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <span className="font-semibold text-gray-700">板主：{board.creatorName}</span>
          <div className="flex items-center gap-1.5">
            {board.allowGuest && (
              <span title="免登入可參與" className="text-emerald-600">
                <UserCheck className="w-3.5 h-3.5" />
              </span>
            )}
            {board.requireApproval && (
              <span title="開啟教師審核" className="text-amber-600">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

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

  const isBoardMine = (b: Board) => {
    if (!currentUser) return false;
    // 嚴格依據開板者唯一 ID 判定擁有權，絕不可單憑姓名比對（避免同名使用者誤判）
    return b.createdBy === currentUser.id;
  };

  const myBoards = currentUser ? boards.filter(isBoardMine) : [];
  const popularBoards = currentUser ? boards : boards.filter((b) => b.isPublic !== false);

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
            {/* 僅教師與系統管理員具備開立新看板權限，訪客與學生不可見 */}
            {(currentUser?.role === 'teacher' || currentUser?.role === 'admin') && (
              <button
                onClick={() => setIsCreateBoardOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold text-sm shadow-lg shadow-amber-600/20 transition transform active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>建立新看板 🎯</span>
              </button>
            )}

            {currentUser ? (
              <>
                <a
                  href="#my-boards"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-amber-50 text-amber-900 font-bold text-sm border border-amber-200 shadow-xs transition"
                >
                  <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
                  <span>我的看板 ⭐</span>
                </a>
                <a
                  href="#popular-boards"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-rose-50 text-rose-900 font-bold text-sm border border-rose-200 shadow-xs transition"
                >
                  <Flame className="w-4 h-4 text-rose-600 fill-rose-500" />
                  <span>熱門看板 🔥</span>
                </a>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold text-sm shadow-lg shadow-amber-600/20 transition transform active:scale-95"
                >
                  <LogIn className="w-4 h-4" />
                  <span>登入帳號 🪪</span>
                </Link>
                <a
                  href="#popular-boards"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-amber-50 text-amber-900 font-bold text-sm border border-amber-200 shadow-xs transition"
                >
                  <Flame className="w-4 h-4 text-rose-600 fill-rose-500" />
                  <span>瀏覽熱門看板 👇</span>
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 登入後專屬區塊：我的看板 */}
      {currentUser && (
        <section id="my-boards" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4 w-full">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Star className="w-5 h-5 fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-gray-900">我的看板</h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    {myBoards.length} 面
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">您建立與管理的專屬教學協作看板</p>
              </div>
            </div>

            {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
              <button
                onClick={() => setIsCreateBoardOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增看板</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm font-medium">
              讀取我的看板中...
            </div>
          ) : myBoards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myBoards.map((b) => (
                <BoardCard key={b.id} board={b} isMyBoard={true} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border-2 border-dashed border-amber-200/90 p-8 text-center shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 text-2xl">
                📋
              </div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">
                {currentUser.role === 'student'
                  ? '您目前尚未建立個人看板'
                  : '您尚未建立任何看板'}
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mb-4 leading-relaxed">
                {currentUser.role === 'student'
                  ? '目前學生身分無需開板，您可以直接前往下方「熱門看板」參與全班討論與互動！若有課堂開板需求可向教師申請。'
                  : '您可以開立專屬的班級看板，設定免登入發文、錄音或審核模式，讓全班學生一秒掃碼加入！'}
              </p>
              {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
                <button
                  onClick={() => setIsCreateBoardOpen(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>立即建立第一個看板</span>
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* 熱門看板區塊 */}
      <section id="popular-boards" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
              <Flame className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-gray-900">熱門看板</h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  {popularBoards.length} 面
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">全校公開精選課堂與即時熱門看板</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm font-medium">
            讀取看板資料中...
          </div>
        ) : popularBoards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularBoards.map((b) => (
              <BoardCard
                key={b.id}
                board={b}
                isMyBoard={isBoardMine(b)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border-2 border-dashed border-rose-200/90 p-10 text-center shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 text-3xl">
              🍂
            </div>
            <h3 className="text-base font-black text-gray-900 mb-1">
              目前系統內尚無活動看板
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mb-5 leading-relaxed font-medium">
              目前尚無公開的教學看板。教師或系統管理員可隨時點擊下方或右上角按鈕，建立新的課堂協作看板！
            </p>
            {(currentUser?.role === 'teacher' || currentUser?.role === 'admin') && (
              <button
                onClick={() => setIsCreateBoardOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-black text-xs shadow-md shadow-amber-600/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>立即建立第一個看板</span>
              </button>
            )}
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
