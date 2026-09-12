'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Sparkles,
  Layers,
  ShieldCheck,
  UserCheck,
  Smile,
  Loader2,
} from 'lucide-react';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBoardCreated?: () => void;
}

const COVER_GRADIENTS = [
  { name: '翠綠晨光', value: 'from-emerald-500 to-teal-700' },
  { name: '鹿陽暖金', value: 'from-amber-500 to-orange-600' },
  { name: '蔚藍天空', value: 'from-sky-500 to-blue-700' },
  { name: '幻彩薰衣草', value: 'from-purple-500 to-indigo-700' },
  { name: '玫瑰暮色', value: 'from-rose-400 to-pink-600' },
];

export function CreateBoardModal({ isOpen, onClose, onBoardCreated }: CreateBoardModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverColor, setCoverColor] = useState(COVER_GRADIENTS[0].value);
  const [allowGuest, setAllowGuest] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [profanityFilter, setProfanityFilter] = useState(true);
  const [reactionType, setReactionType] = useState<'like' | 'vote' | 'star'>('like');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('請輸入看板標題');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          coverColor,
          layoutType: 'stream',
          allowGuest,
          requireApproval,
          profanityFilter,
          reactionType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '建立看板失敗');
      }

      onClose();
      if (onBoardCreated) onBoardCreated();
      router.push(`/boards/${data.board.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '建立看板失敗';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-amber-100 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900">建立新的鹿鳴牆看板</h3>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          設定課堂討論主題、排版與學生參與權限
        </p>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 看板標題 */}
          <div>
            <label className="block text-xs font-black text-gray-900 mb-1">
              看板標題 *
            </label>
            <input
              type="text"
              required
              placeholder="例如：四年甲班・閱讀心得與生活札記 🌿"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm font-bold bg-white text-gray-950 placeholder:text-gray-500 border-2 border-gray-300 rounded-xl px-3.5 py-2.5 outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200 shadow-2xs"
            />
          </div>

          {/* 說明或任務指引 */}
          <div>
            <label className="block text-xs font-black text-gray-900 mb-1">
              課堂指引或說明（選填）
            </label>
            <textarea
              rows={2}
              placeholder="給學生的小提示，例如：每位同學請貼上 1 張照片並附上 50 字心得..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs font-bold bg-white text-gray-950 placeholder:text-gray-500 border-2 border-gray-300 rounded-xl px-3.5 py-2 outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200 shadow-2xs resize-none"
            />
          </div>

          {/* 主題色彩 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              主題桌布風格
            </label>
            <div className="flex items-center gap-2">
              {COVER_GRADIENTS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setCoverColor(g.value)}
                  className={`flex-1 h-9 rounded-xl bg-gradient-to-r ${g.value} transition-transform ${
                    coverColor === g.value ? 'scale-110 ring-2 ring-amber-500 ring-offset-2' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={g.name}
                />
              ))}
            </div>
          </div>

          {/* 版型選擇 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              排版模式
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl border-2 border-amber-500 bg-amber-50/50 text-center cursor-pointer">
                <div className="text-base font-bold text-amber-900 mb-0.5">串流 Stream</div>
                <div className="text-[10px] text-amber-700 font-semibold">第一期核心首選</div>
              </div>
              <div className="p-3 rounded-2xl border border-gray-200 bg-gray-50 text-center opacity-60">
                <div className="text-sm font-semibold text-gray-700 mb-0.5">分欄 Shelf</div>
                <div className="text-[10px] text-gray-400">下期解鎖</div>
              </div>
              <div className="p-3 rounded-2xl border border-gray-200 bg-gray-50 text-center opacity-60">
                <div className="text-sm font-semibold text-gray-700 mb-0.5">畫布 Canvas</div>
                <div className="text-[10px] text-gray-400">下期解鎖</div>
              </div>
            </div>
          </div>

          {/* 課堂安全與管理開關 */}
          <div className="space-y-2.5 pt-2 border-t border-gray-100">
            {/* 免登入參與 */}
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100/70 cursor-pointer transition">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="text-xs font-bold text-gray-800">允許免登入參與</div>
                  <div className="text-[10px] text-gray-500">學生掃描 QR Code 即可輸入座號姓名直接發表</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={allowGuest}
                onChange={(e) => setAllowGuest(e.target.checked)}
                className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500"
              />
            </label>

            {/* 內容審核開關 */}
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100/70 cursor-pointer transition">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <div>
                  <div className="text-xs font-bold text-gray-800">開啟課堂貼文審核</div>
                  <div className="text-[10px] text-gray-500">學生發文需經由老師批准後方對全班公開</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
                className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500"
              />
            </label>

            {/* 不雅詞過濾 */}
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100/70 cursor-pointer transition">
              <div className="flex items-center gap-2.5">
                <Smile className="w-4 h-4 text-pink-600" />
                <div>
                  <div className="text-xs font-bold text-gray-800">不雅詞過濾器</div>
                  <div className="text-[10px] text-gray-500">自動將不當字詞替換為可愛 Emoji (🌸🐱✨)</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={profanityFilter}
                onChange={(e) => setProfanityFilter(e.target.checked)}
                className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500"
              />
            </label>
          </div>

          {/* 送出 */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold shadow-md transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>建立中...</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>建立看板並進入</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
