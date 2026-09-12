'use client';

import React, { useState } from 'react';
import { User } from '@/types';
import { X, GraduationCap, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface ApplyTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onApplicationUpdated: (updatedUser: User) => void;
}

export function ApplyTeacherModal({
  isOpen,
  onClose,
  currentUser,
  onApplicationUpdated,
}: ApplyTeacherModalProps) {
  const [reason, setReason] = useState(currentUser.teacherApplicationReason || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isPending = currentUser.teacherApplicationStatus === 'pending';
  const isRejected = currentUser.teacherApplicationStatus === 'rejected';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/user/apply-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '申請失敗');
      }

      setSuccessMsg('您的申請已成功送出！管理者收到通知後將會盡快核定。');
      onApplicationUpdated(data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '送出申請時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
              申請成為教師身分
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              由系統管理人員或現任老師審核後核定
            </p>
          </div>
        </div>

        {isPending ? (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  資格審核中
                </h4>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1 leading-relaxed">
                  您的申請已送交管理人員。在核定前，您仍可以學生身分正常瀏覽與參與看板互動。
                </p>
                {currentUser.teacherApplicationReason && (
                  <div className="mt-2 text-xs text-amber-900 bg-amber-100/70 px-2.5 py-1 rounded-lg">
                    備註：{currentUser.teacherApplicationReason}
                  </div>
                )}
                {currentUser.teacherAppliedAt && (
                  <div className="mt-1 text-[10px] text-amber-700/70">
                    申請時間：{new Date(currentUser.teacherAppliedAt).toLocaleString('zh-TW')}
                  </div>
                )}
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition"
              >
                關閉視窗
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRejected && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl p-3 text-xs text-red-800 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>您先前的申請已被管理者退回，保留學生身分。您可以補充說明後再次申請。</span>
              </div>
            )}

            {successMsg ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-4 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  申請已送出！
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  {successMsg}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition"
                  >
                    好，我知道了
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-gray-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-gray-100 dark:border-slate-800 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">目前帳號：</span>
                    <span className="font-bold text-gray-800 dark:text-gray-100">{currentUser.name}</span>
                  </div>
                  {currentUser.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">電子信箱：</span>
                      <span className="font-mono text-gray-700 dark:text-gray-200">{currentUser.email}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">目前身分：</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-[11px]">學生</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    任教單位 / 學校 / 申請說明（選填）
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="例如：任教學校、任教科目、需要開立課程看板等說明..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition resize-none"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    填寫詳細說明有助於系統管理者快速核定您的教師資格。
                  </p>
                </div>

                {error && (
                  <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-200 dark:shadow-none transition disabled:opacity-50"
                  >
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isRejected ? '重新送出申請' : '送出教師身分申請'}</span>
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
