'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User } from '@/types';
import {
  X,
  UserCog,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  Globe,
  School,
  Lock,
  Crown,
  Briefcase,
  GraduationCap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUserUpdated: (updatedUser: User) => void;
}

export function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}: UserProfileModalProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState(currentUser.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 當 modal 開啟或 currentUser 改變時，重設表單狀態
  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !mounted) return null;

  const isGoogle = currentUser.provider === 'google';
  const isSSO = currentUser.provider === 'luyang_sso';
  const isLocal = currentUser.provider === 'local';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('顯示暱稱不可為空白');
      return;
    }

    // 密碼驗證
    if (isLocal && showPasswordSection && (newPassword || currentPassword || confirmPassword)) {
      if (!currentPassword) {
        setError('修改密碼請輸入「目前密碼」');
        return;
      }
      if (!newPassword) {
        setError('請輸入「新密碼」');
        return;
      }
      if (newPassword.length < 6) {
        setError('新密碼長度需至少 6 個字元');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('兩次輸入的新密碼不相符，請重新確認');
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload: {
        name: string;
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
      } = {
        name: trimmedName,
      };

      if (isLocal && showPasswordSection && newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
        payload.confirmPassword = confirmPassword;
      }

      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '更新個人資料失敗');
      }

      setSuccessMsg(data.message || '個人資料已成功更新！');
      onUserUpdated(data.user);

      // 成功後清空密碼欄位
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '更新時發生錯誤';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative my-auto w-full max-w-md max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-100 dark:border-slate-800 overflow-hidden">
        {/* 頂部固定標頭 */}
        <div className="px-5 py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
              <UserCog className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-gray-100 leading-tight">
                會員資料與設定
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                修改個人顯示暱稱與帳號管理
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition"
            title="關閉視窗 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 主體表單與滾動區 */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* 錯誤反饋提示 */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs font-bold text-red-600 dark:text-red-300 animate-fade-in flex items-center gap-2">
                <X className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {/* 成功反饋提示 */}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 animate-fade-in flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 精簡帳號身分條 (Compact Account Bar) */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/70 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {currentUser.role === 'admin' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                    <Crown className="w-3.5 h-3.5" />
                    管理員
                  </span>
                ) : currentUser.role === 'teacher' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    <Briefcase className="w-3.5 h-3.5" />
                    教師
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                    <GraduationCap className="w-3.5 h-3.5" />
                    學生
                  </span>
                )}
                <span className="font-mono text-gray-700 dark:text-gray-300 font-bold truncate max-w-[140px] sm:max-w-[200px]">
                  {currentUser.username}
                </span>
              </div>

              {isGoogle ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 shrink-0">
                  <Globe className="w-3.5 h-3.5" />
                  Google 登入
                </span>
              ) : isSSO ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 shrink-0">
                  <School className="w-3.5 h-3.5" />
                  校園 SSO
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 shrink-0">
                  <Lock className="w-3.5 h-3.5" />
                  帳號密碼
                </span>
              )}
            </div>

            {/* 1. 修改暱稱 / 姓名（所有身分皆可修改） */}
            <div>
              <label className="block text-xs font-black text-gray-900 dark:text-gray-100 mb-1.5">
                顯示暱稱 / 中文姓名 *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：林老師、王小明"
                maxLength={50}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-300 bg-white text-gray-950 text-sm font-bold placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                此名稱將呈現在您所發表的便籤、評分、回饋與討論留言中
              </p>
            </div>

            {/* 2. 密碼管理區塊 */}
            {isGoogle ? (
              /* Google 帳號專屬精簡提示卡 */
              <div className="p-3 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-white dark:bg-sky-900 shadow-xs text-sky-600 dark:text-sky-300 shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <p className="text-xs text-sky-800 dark:text-sky-300 leading-tight">
                  Google 帳號由 Google 集中身分驗證與安全保護，<strong>無須且無法修改密碼</strong>。此處僅供自訂顯示暱稱。
                </p>
              </div>
            ) : isSSO ? (
              /* SSO 帳號提示卡 */
              <div className="p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-white dark:bg-indigo-900 shadow-xs text-indigo-600 dark:text-indigo-300 shrink-0">
                  <School className="w-4 h-4" />
                </div>
                <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-tight">
                  校園 SSO 帳號由學校入口網統一管理，密碼請至入口網站變更，此處僅能自訂顯示暱稱。
                </p>
              </div>
            ) : (
              /* 一般本地帳號密碼修改區塊（支援折疊展開） */
              <div className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-gray-200 dark:border-slate-700 transition text-left text-xs font-bold text-gray-800 dark:text-gray-200"
                >
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>變更登入密碼 (選填)</span>
                  </div>
                  {showPasswordSection ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {showPasswordSection && (
                  <div className="space-y-3 pt-1 animate-fade-in">
                    {/* 目前密碼 */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        目前密碼 *
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="輸入目前的舊密碼"
                          className="w-full px-3.5 py-2 pr-10 rounded-xl border-2 border-gray-300 bg-white text-gray-950 text-xs font-bold placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* 新密碼 */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        新密碼（至少 6 個字元）*
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="設定新的登入密碼"
                          minLength={6}
                          className="w-full px-3.5 py-2 pr-10 rounded-xl border-2 border-gray-300 bg-white text-gray-950 text-xs font-bold placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* 確認新密碼 */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        再次確認新密碼 *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="再次輸入新密碼以防打錯"
                          minLength={6}
                          className="w-full px-3.5 py-2 pr-10 rounded-xl border-2 border-gray-300 bg-white text-gray-950 text-xs font-bold placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 底部按鈕區 */}
          <div className="p-4 bg-gray-50/90 dark:bg-slate-900/90 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-black shadow-md shadow-amber-200 dark:shadow-none transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>儲存中...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>儲存變更</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
