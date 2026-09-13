'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Sparkles,
  Layers,
  LayoutGrid,
  ShieldCheck,
  UserCheck,
  Smile,
  Loader2,
  Globe,
  Lock,
} from 'lucide-react';
import { BoardLayoutType } from '@/types';

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
  const [layoutType, setLayoutType] = useState<BoardLayoutType>('wall');
  const [isPublic, setIsPublic] = useState(true);
  const [allowGuest, setAllowGuest] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [profanityFilter, setProfanityFilter] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          layoutType,
          isPublic,
          allowGuest,
          requireApproval,
          profanityFilter,
          reactionType: 'like',
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-amber-100 overflow-hidden relative">
        {/* 頂部固定標頭（保證叉叉永遠點得到） */}
        <div className="px-5 py-3.5 bg-white/95 backdrop-blur-md border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-100 text-amber-800">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 leading-tight">建立新的鹿鳴牆看板</h3>
              <p className="text-[11px] text-gray-500 font-medium">設定討論主題、排版與學生參與權限</p>
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

        {/* 可滑動主體內容區 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-5 space-y-4 flex-1">
            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600">
                {error}
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
                placeholder="例如：四年甲班・閱讀心得與生活札記 🌿"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs font-bold bg-white text-gray-950 placeholder:text-gray-400 border-2 border-gray-300 rounded-xl px-3 py-2 outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200 shadow-2xs"
              />
            </div>

            {/* 說明或指引 */}
            <div>
              <label className="block text-xs font-black text-gray-900 mb-1">
                課堂指引或說明（選填）
              </label>
              <textarea
                rows={2}
                placeholder="給學生的小提示，例如：每位同學請貼上 1 張照片並附上 50 字心得..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs font-bold bg-white text-gray-950 placeholder:text-gray-400 border-2 border-gray-300 rounded-xl px-3 py-2 outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200 shadow-2xs resize-none"
              />
            </div>

            {/* 主題色彩 */}
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

            {/* 看板風格版型 */}
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
                    <div className="text-xs font-black text-gray-900">磚牆</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                      便籤自適應緊密排列，適合作品展、心得牆
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
                    <div className="text-xs font-black text-gray-900">分欄</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                      依主題直欄橫向滑動，適合分組討論與單元歸類
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* 課堂權限與安全設定 */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="text-xs font-black text-gray-900 mb-1">
                課堂隱私與參與權限
              </div>

              {/* 瀏覽權限：公開 vs 僅限校內登入 */}
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100/80 cursor-pointer border border-gray-200/60 transition">
                <div className="flex items-center gap-2.5">
                  {isPublic ? (
                    <Globe className="w-4 h-4 text-sky-600 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-gray-900">
                      {isPublic ? '公開看板（未登入者也可看）' : '校內私人看板（需登入才可看）'}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {isPublic ? '任何人皆可透過連結或 QR Code 檢視內容' : '僅限持有校內帳號登入之師生才可檢視'}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500 shrink-0"
                />
              </label>

              {/* 發表權限：免登入參與 vs 限制需登入發表 */}
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100/80 cursor-pointer border border-gray-200/60 transition">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-gray-900">允許免登入發表</div>
                    <div className="text-[10px] text-gray-500">學生輸入座號姓名即可貼便籤；關閉則必須登入</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowGuest}
                  onChange={(e) => setAllowGuest(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500 shrink-0"
                />
              </label>

              {/* 課堂貼文審核 */}
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100/80 cursor-pointer border border-gray-200/60 transition">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-gray-900">開啟課堂貼文審核</div>
                    <div className="text-[10px] text-gray-500">學生發文需經老師批准後才對全班公開</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={(e) => setRequireApproval(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500 shrink-0"
                />
              </label>

              {/* 不雅詞過濾器 */}
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100/80 cursor-pointer border border-gray-200/60 transition">
                <div className="flex items-center gap-2.5">
                  <Smile className="w-4 h-4 text-pink-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-gray-900">不雅詞過濾器</div>
                    <div className="text-[10px] text-gray-500">自動將不當字詞替換為可愛 Emoji (🌸🐱✨)</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={profanityFilter}
                  onChange={(e) => setProfanityFilter(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-amber-600 focus:ring-amber-500 shrink-0"
                />
              </label>
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
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-black shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>建立中...</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5" />
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
