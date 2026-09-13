'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Board, UserRole } from '@/types';
import { Navbar } from '@/components/common/Navbar';
import {
  ShieldAlert,
  Users,
  Layers,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Crown,
  GraduationCap,
  Briefcase,
  Bell,
  Clock,
  Check,
  X,
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.user || (meData.user.role !== 'admin' && meData.user.role !== 'teacher')) {
        router.push('/');
        return;
      }
      setCurrentUser(meData.user);

      // 載入使用者清單
      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();
      if (usersRes.ok) {
        setUsers(usersData.users || []);
      }

      // 載入看板清單
      const boardsRes = await fetch('/api/boards');
      const boardsData = await boardsRes.json();
      if (boardsRes.ok) {
        setBoards(boardsData.boards || []);
      }
    } catch {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 審核教師資格申請（核准或退回）
  const handleReviewApplication = async (userId: string, action: 'approve_application' | 'reject_application') => {
    setUpdatingId(userId);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '審核操作失敗');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...data.user } : u))
      );
      setMessage({
        type: 'success',
        text: action === 'approve_application' ? '已成功核准並將該成員核定為教師身分！' : '已退回該申請，保留學生身分。',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失敗';
      setMessage({ type: 'error', text: msg });
    } finally {
      setUpdatingId(null);
    }
  };

  // 變更使用者身分
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '變更身分失敗');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setMessage({ type: 'success', text: '已成功更新使用者身分！' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '更新失敗';
      setMessage({ type: 'error', text: msg });
    } finally {
      setUpdatingId(null);
    }
  };

  // 刪除使用者
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`確定要移除使用者「${userName}」的帳號嗎？`)) return;

    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '刪除失敗');
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setMessage({ type: 'success', text: `已移除使用者「${userName}」` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '刪除失敗';
      setMessage({ type: 'error', text: msg });
    }
  };

  // 管理員強制刪除看板
  const handleDeleteBoard = async (boardId: string, boardTitle: string) => {
    if (!confirm(`系統管理員操作：確定要刪除看板「${boardTitle}」嗎？此操作無法復原！`)) return;

    try {
      const res = await fetch(`/api/boards/${boardId}`, { method: 'DELETE' });
      if (res.ok) {
        setBoards((prev) => prev.filter((b) => b.id !== boardId));
        setMessage({ type: 'success', text: `已成功刪除看板「${boardTitle}」` });
      }
    } catch {
      setMessage({ type: 'error', text: '刪除看板失敗' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
      </div>
    );
  }

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'teacher')) {
    return null;
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* 頂部導航 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <Crown className="w-5 h-5 text-amber-500" />
                ) : (
                  <Briefcase className="w-5 h-5 text-emerald-600" />
                )}
                <h1 className="text-2xl font-black text-gray-900">
                  {isAdmin ? '系統管理員後台' : '校內成員身分核定與管理'}
                </h1>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isAdmin ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                }`}>
                  {isAdmin ? 'Admin' : 'Teacher'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {isAdmin
                  ? '核定教師與管理員身分、帳號註銷，以及全站看板掌控'
                  : '檢視校內已登入成員名單，並核定將學生提升為教師或調整身分'}
              </p>
            </div>
          </div>
        </div>

        {/* 提示訊息 */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* 待審核教師身分申請通知區（有待處理申請時高亮置頂） */}
        {(() => {
          const pendingUsers = users.filter((u) => u.teacherApplicationStatus === 'pending');
          if (pendingUsers.length === 0) return null;

          return (
            <section className="mb-8 bg-gradient-to-r from-amber-500/10 via-amber-100 to-amber-50 border-2 border-amber-400 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md animate-bounce">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-amber-950 flex items-center gap-2">
                    <span>待審核教師身分申請</span>
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-black animate-pulse">
                      {pendingUsers.length} 件待處理
                    </span>
                  </h2>
                  <p className="text-xs text-amber-900/80 mt-0.5">
                    以下學生已送出教師資格申請，您可以直接將其核定為教師，或退回申請保留學生身分。
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingUsers.map((applicant) => (
                  <div
                    key={applicant.id}
                    className="bg-white p-4 rounded-2xl border border-amber-300 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                          <span>{applicant.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold">
                            學生
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-2">
                        <span>帳號: {applicant.username}</span>
                        {applicant.email && <span className="text-gray-400">({applicant.email})</span>}
                      </div>

                      {applicant.teacherApplicationReason && (
                        <div className="mt-2.5 text-xs bg-amber-50 text-amber-900 p-2.5 rounded-xl border border-amber-200 leading-relaxed">
                          <span className="font-bold">申請說明：</span>
                          {applicant.teacherApplicationReason}
                        </div>
                      )}

                      {applicant.teacherAppliedAt && (
                        <div className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>申請時間：{new Date(applicant.teacherAppliedAt).toLocaleString('zh-TW')}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleReviewApplication(applicant.id, 'approve_application')}
                        disabled={updatingId === applicant.id}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                      >
                        {updatingId === applicant.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>核定為教師</span>
                      </button>
                      <button
                        onClick={() => handleReviewApplication(applicant.id, 'reject_application')}
                        disabled={updatingId === applicant.id}
                        className="flex-1 py-2 px-3 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-700 border border-gray-300 hover:border-red-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>退回申請（保留學生）</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* 第一大區：使用者身分核定與名冊 */}
        <section className="bg-white rounded-3xl p-6 shadow-xs border border-gray-200/80 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-extrabold text-gray-900">全站使用者管理與身分核定</h2>
              <span className="text-xs bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-md">
                {users.length} 位
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold">
                  <th className="pb-3 px-3">使用者</th>
                  <th className="pb-3 px-3">來源</th>
                  <th className="pb-3 px-3">目前身分</th>
                  <th className="pb-3 px-3">身分核定調整</th>
                  <th className="pb-3 px-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                        {u.name}
                        {u.id === currentUser.id && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded font-normal">
                            本人
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 flex items-center gap-1.5 flex-wrap">
                        <span>帳號: {u.username}</span>
                        {u.email && (
                          <span className="text-gray-500 font-normal">
                            ({u.email})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11px]">
                        {u.provider === 'luyang_sso'
                          ? '🏫 鹿陽 SSO'
                          : u.provider === 'google'
                          ? '🌐 Google'
                          : '🔑 註冊帳號'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      {u.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs">
                          <Crown className="w-3 h-3 text-amber-600" />
                          系統管理員
                        </span>
                      ) : u.role === 'teacher' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs">
                          <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                          教師
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 font-bold text-xs">
                            <GraduationCap className="w-3 h-3 text-blue-600" />
                            學生
                          </span>
                          {u.teacherApplicationStatus === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold text-[10px] animate-pulse">
                              <Clock className="w-3 h-3 text-amber-600" />
                              申請為老師中
                            </span>
                          )}
                          {u.teacherApplicationStatus === 'rejected' && (
                            <span className="text-[10px] text-gray-400">
                              (申請已退回)
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      {/* 1. 自己不能核定自己的身分 */}
                      {u.id === currentUser.id ? (
                        <span className="text-xs text-gray-400 font-medium italic">
                          本人（無法變更自己的身分）
                        </span>
                      ) : u.teacherApplicationStatus === 'pending' ? (
                        /* 待審核教師申請快速操作按鈕 */
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            disabled={updatingId === u.id}
                            onClick={() => handleReviewApplication(u.id, 'approve_application')}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1 disabled:opacity-50"
                            title="核定該學生升格為教師"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>核定為老師</span>
                          </button>
                          <button
                            disabled={updatingId === u.id}
                            onClick={() => handleReviewApplication(u.id, 'reject_application')}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-700 border border-gray-300 hover:border-red-200 transition flex items-center gap-1 disabled:opacity-50"
                            title="退回申請，保留學生身分"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>退回申請</span>
                          </button>
                        </div>
                      ) : !isAdmin && u.role === 'admin' ? (
                        /* 2. 老師不能夠核定系統管理人員的身分 */
                        <span className="text-xs text-gray-400 font-medium">
                          系統管理員（受保護）
                        </span>
                      ) : !isAdmin && u.role === 'teacher' ? (
                        /* 3. 老師只能把學生核定為老師（對已是教師者不顯示變更） */
                        <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          已具備教師身分
                        </span>
                      ) : !isAdmin && u.role === 'student' ? (
                        /* 4. 老師只能把學生核定為老師 */
                        <button
                          disabled={updatingId === u.id}
                          onClick={() => handleRoleChange(u.id, 'teacher')}
                          className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1 disabled:opacity-50"
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>核定為教師</span>
                        </button>
                      ) : (
                        /* 5. 系統管理人員可以核定老師跟學生的身份 */
                        <div className="flex items-center gap-1">
                          <button
                            disabled={updatingId === u.id || u.role === 'student'}
                            onClick={() => handleRoleChange(u.id, 'student')}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                              u.role === 'student'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                            }`}
                          >
                            設為學生
                          </button>
                          <button
                            disabled={updatingId === u.id || u.role === 'teacher'}
                            onClick={() => handleRoleChange(u.id, 'teacher')}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                              u.role === 'teacher'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                            }`}
                          >
                            核定為教師
                          </button>
                          <button
                            disabled={updatingId === u.id || u.role === 'admin'}
                            onClick={() => handleRoleChange(u.id, 'admin')}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                              u.role === 'admin'
                                ? 'bg-amber-600 text-white shadow-2xs'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                            }`}
                          >
                            設為管理員
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {isAdmin && u.id !== currentUser.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          title="移除此帳號"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 第二大區：全站看板管理 */}
        <section className="bg-white rounded-3xl p-6 shadow-xs border border-gray-200/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-extrabold text-gray-900">全站看板總管</h2>
              <span className="text-xs bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-md">
                {boards.length} 面
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {boards.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition"
              >
                <div>
                  <Link
                    href={`/boards/${b.id}`}
                    className="font-bold text-sm text-gray-900 hover:text-amber-600 transition"
                  >
                    {b.title}
                  </Link>
                  <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                    <span>開板者: {b.creatorName}</span>
                    <span>•</span>
                    <span>版型: {b.layoutType}</span>
                    <span>•</span>
                    <span>{b.allowGuest ? '允許訪客' : '限定登入'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/boards/${b.id}`}
                    className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                  >
                    查看看板
                  </Link>
                  {(currentUser?.role === 'admin' || b.createdBy === currentUser?.id) && (
                    <button
                      onClick={() => handleDeleteBoard(b.id, b.title)}
                      className="p-1.5 rounded-xl text-red-500 hover:bg-red-50 transition"
                      title={currentUser?.role === 'admin' ? '管理員強制刪除看板' : '刪除我的看板'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
