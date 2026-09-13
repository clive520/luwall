'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Board, BoardLayoutType } from '@/types';
import {
  X,
  Settings,
  ShieldCheck,
  UserCheck,
  Smile,
  Loader2,
  Globe,
  Lock,
  Trash2,
  CheckCircle2,
  Layers,
  LayoutGrid,
} from 'lucide-react';

interface BoardSettingsModalProps {
  board: Board;
  isOpen: boolean;
  onClose: () => void;
  onBoardUpdated: (updatedBoard: Board) => void;
}

const COVER_GRADIENTS = [
  { name: '翠綠晨光', value: 'from-emerald-500 to-teal-700' },
  { name: '鹿陽暖金', value: 'from-amber-500 to-orange-600' },
  { name: '蔚藍天空', value: 'from-sky-500 to-blue-700' },
  { name: '幻彩薰衣草', value: 'from-purple-500 to-indigo-700' },
  { name: '玫瑰暮色', value: 'from-rose-400 to-pink-600' },
];

export function BoardSettingsModal({
  board,
  isOpen,
  onClose,
  onBoardUpdated,
}: BoardSettingsModalProps) {
  const router = useRouter();

  const [title, setTitle] = useState(board.title);
  const [description, setDescription] = useState(board.description || '');
  const [coverColor, setCoverColor] = useState(board.coverColor || COVER_GRADIENTS[0].value);
  const [layoutType, setLayoutType] = useState<BoardLayoutType>(board.layoutType || 'shelf');
  const [isPublic, setIsPublic] = useState(board.isPublic !== false);
  const [allowGuest, setAllowGuest] = useState(board.allowGuest !== false);
  const [requireApproval, setRequireApproval] = useState(board.requireApproval || false);
  const [profanityFilter, setProfanityFilter] = useState(board.profanityFilter !== false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (board) {
      setTitle(board.title);
      setDescription(board.description || '');
      setCoverColor(board.coverColor || COVER_GRADIENTS[0].value);
      setLayoutType(board.layoutType || 'shelf');
      setIsPublic(board.isPublic !== false);
      setAllowGuest(board.allowGuest !== false);
      setRequireApproval(board.requireApproval || false);
      setProfanityFilter(board.profanityFilter !== false);
    }
  }, [board, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('請輸入看板標題');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          coverColor,
          layoutType,
          isPublic,
          allowGuest,
          requireApproval,
          profanityFilter,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '儲存設定失敗');
      }

      setSuccessMsg('看板設定已更新！');
      onBoardUpdated(data.board);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '儲存設定失敗';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`確定要刪除看板「${board.title}」嗎？所有主題欄位與便籤將一併被永久刪除，此操作無法復原！`)) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/boards/${board.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        alert('看板已成功刪除');
        router.push('/');
      } else {
        const d = await res.json();
        setError(d.error || '刪除失敗');
      }
    } catch {
      setError('刪除看板時發生錯誤');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-amber-100 overflow-hidden relative">
        {/* 頂部固定標頭（叉叉永遠點得到） */}
        <div className="px-5 py-3.5 bg-white/95 backdrop-blur-md border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-100 text-amber-800">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 leading-tight">看板設定與權限</h3>
              <p className="text-[11px] text-gray-500 font-medium">管理課堂隱私、瀏覽與發表條件</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-full transition"
            title="關閉視窗 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 可滾動主體設定區 */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-5 space-y-4 flex-1">
            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 看板標題 */}
            <div>
              <label className="block text-xs font-black text-gray-900 mb-1">
                看板標題 *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs font-bold bg-white text-gray-950 placeholder:text-gray-400 border-2 border-gray-300 rounded-xl px-3 py-2 outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200 shadow-2xs"
              />
            </div>

            {/* 課堂指引說明 */}
            <div>
              <label className="block text-xs font-black text-gray-900 mb-1">
                課堂指引或說明
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="給學生的任務說明..."
                className="w-full text-xs font-bold bg-white text-gray-950 placeholder:text-gray-400 border-2 border-gray-300 rounded-xl px-3 py-2 outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200 shadow-2xs resize-none"
              />
            </div>

            {/* 主題桌布色彩 */}
            <div>
              <label className="block text-xs font-black text-gray-900 mb-1.5">
                主題桌布色彩
              </label>
              <div className="grid grid-cols-5 gap-2">
                {COVER_GRADIENTS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setCoverColor(g.value)}
                    className={`h-8 rounded-xl bg-gradient-to-r ${g.value} transition-transform ${
                      coverColor === g.value ? 'scale-105 ring-2 ring-amber-500 ring-offset-2' : 'opacity-80 hover:opacity-100'
                    }`}
                    title={g.name}
                  />
                ))}
              </div>
            </div>

            {/* 看板呈現風格版型 */}
            <div>
              <label className="block text-xs font-black text-gray-900 mb-1.5">
                看板呈現風格
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setLayoutType('wall')}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition ${
                    layoutType === 'wall'
                      ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-gray-900">磚牆瀑布流 (Wall)</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                      便籤緊密自適應貼合，適合成果展覽、心得便利貼牆
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setLayoutType('shelf')}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition ${
                    layoutType === 'shelf'
                      ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-gray-900">分欄貨架 (Shelf)</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                      依主題直欄橫向滑動，適合分組討論與單元歸類
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* 核心權限開關 */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="text-xs font-black text-gray-900 mb-1">
                隱私與參與權限
              </div>

              {/* 1. 一般沒有登入的人能不能看得到？ */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-gray-100/80 cursor-pointer border border-gray-200/60 transition">
                <div className="flex items-center gap-2.5">
                  {isPublic ? (
                    <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                      <Globe className="w-4 h-4 shrink-0" />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                      <Lock className="w-4 h-4 shrink-0" />
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-gray-900">
                      {isPublic ? '公開看板（未登入者也能檢視）' : '校內私人看板（需登入才可看）'}
                    </div>
                    <div className="text-[10px] text-gray-500 font-medium leading-tight">
                      {isPublic
                        ? '校外訪客或學生無須登入即可瀏覽看板內容'
                        : '未登入者無法瀏覽內容，需以學校帳號登入'}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500 shrink-0 ml-2"
                />
              </label>

              {/* 2. 需不需要登入才可以發表？ */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-gray-100/80 cursor-pointer border border-gray-200/60 transition">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                    <UserCheck className="w-4 h-4 shrink-0" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">
                      {allowGuest ? '允許免登入發表（填暱稱即可）' : '限制必須登入才可發表'}
                    </div>
                    <div className="text-[10px] text-gray-500 font-medium leading-tight">
                      {allowGuest
                        ? '學生掃碼即可直接輸入姓名發表便籤'
                        : '必須持有帳號登入後才允許張貼便籤'}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowGuest}
                  onChange={(e) => setAllowGuest(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500 shrink-0 ml-2"
                />
              </label>

              {/* 3. 課堂貼文審核 */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-gray-100/80 cursor-pointer border border-gray-200/60 transition">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">開啟課堂貼文審核</div>
                    <div className="text-[10px] text-gray-500 font-medium leading-tight">
                      學生發布之便籤需經教師批准後方對全體公開
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={(e) => setRequireApproval(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500 shrink-0 ml-2"
                />
              </label>

              {/* 4. 不雅詞過濾器 */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-gray-100/80 cursor-pointer border border-gray-200/60 transition">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-pink-100 text-pink-700">
                    <Smile className="w-4 h-4 shrink-0" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">不雅詞過濾器</div>
                    <div className="text-[10px] text-gray-500 font-medium leading-tight">
                      自動將不良詞彙替換為可愛 Emoji (🌸🐱✨)
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={profanityFilter}
                  onChange={(e) => setProfanityFilter(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500 shrink-0 ml-2"
                />
              </label>
            </div>

            {/* 危險操作區：刪除看板 */}
            <div className="pt-3 border-t border-red-100">
              <div className="p-3 rounded-2xl bg-red-50/60 border border-red-200/70 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-red-900">刪除此看板</div>
                  <div className="text-[10px] text-red-600 font-medium">
                    永久移除此看板與所有相關主題、卡片
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold shadow-xs transition shrink-0 flex items-center gap-1 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deleting ? '刪除中...' : '刪除看板'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 底部固定操作按鈕列 */}
          <div className="px-5 py-3 bg-gray-50/90 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-black shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>儲存中...</span>
                </>
              ) : (
                <span>儲存看板設定</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
