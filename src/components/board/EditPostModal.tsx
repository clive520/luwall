'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Post, Section, MediaAttachment } from '@/types';
import { AudioRecorder, AudioRecorderHandle } from '@/components/media/AudioRecorder';
import { LinkPreviewCard } from '@/components/media/LinkPreviewCard';
import { FileAttachmentCard } from '@/components/media/FileAttachmentCard';
import { extractYouTubeId, getYouTubeThumbnail, findUrls } from '@/lib/media';
import {
  X,
  Image as ImageIcon,
  Mic,
  Link as LinkIcon,
  Paperclip,
  Save,
  Loader2,
  Folder,
  UploadCloud,
  Volume2,
} from 'lucide-react';

interface EditPostModalProps {
  post: Post;
  sections?: Section[];
  isOpen: boolean;
  onClose: () => void;
  onPostUpdated: (updatedPost: Post) => void;
}

const PASTEL_COLORS = [
  { name: '經典暖黃', value: '#fef08a' },
  { name: '活力櫻粉', value: '#fbcfe8' },
  { name: '清爽薄荷', value: '#bbf7d0' },
  { name: '晨曦晴空', value: '#bae6fd' },
  { name: '薰衣草紫', value: '#e9d5ff' },
  { name: '雪白簡約', value: '#ffffff' },
];

export function EditPostModal({
  post,
  sections = [],
  isOpen,
  onClose,
  onPostUpdated,
}: EditPostModalProps) {
  const audioRecorderRef = useRef<AudioRecorderHandle | null>(null);
  const [title, setTitle] = useState(post.title || '');
  const [content, setContent] = useState(post.content || '');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(post.sectionId || '');
  const [selectedColor, setSelectedColor] = useState(post.color || '#fef08a');
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'audio' | 'link' | 'file'>(
    post.attachment?.type || 'none'
  );
  const [attachment, setAttachment] = useState<MediaAttachment | undefined>(post.attachment);
  const [linkInput, setLinkInput] = useState(post.attachment?.type === 'link' ? post.attachment.url : '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [loadingLinkPreview, setLoadingLinkPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  useEffect(() => {
    setTitle(post.title || '');
    setContent(post.content || '');
    setSelectedSectionId(post.sectionId || (sections[0]?.id ?? ''));
    setSelectedColor(post.color || '#fef08a');
    setAttachment(post.attachment);
    setMediaType(post.attachment?.type || 'none');
    setLinkInput(post.attachment?.type === 'link' ? post.attachment.url : '');
    setError(null);
  }, [post, sections, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 解析內文中額外偵測到的連結縮圖 (例如第二個連結) - 必須在條件式 return 之前調用
  const extraLinksFromContent = useMemo(() => {
    if (!isOpen) return [];
    const urls = findUrls(content);
    const list: MediaAttachment[] = [];
    const seen = new Set<string>();
    if (attachment && attachment.type === 'link' && attachment.url) {
      seen.add(attachment.url.trim().toLowerCase());
    }
    for (const u of urls) {
      const norm = u.trim().toLowerCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        const ytId = extractYouTubeId(u);
        list.push({
          type: 'link',
          url: u,
          title: ytId ? 'YouTube 影片' : u,
          metadata: ytId
            ? {
                youtubeId: ytId,
                ogImage: getYouTubeThumbnail(ytId),
              }
            : undefined,
        });
      }
    }
    return list;
  }, [isOpen, content, attachment]);

  if (!isOpen) return null;

  // 統一檔案上傳邏輯 (支援拖曳、剪貼簿與按鈕選擇)
  const uploadFileOrDocument = async (file: File) => {
    // 嚴格拒絕影片直接上傳
    if (file.type.toLowerCase().startsWith('video/')) {
      setError('為保障系統效能，不支援影片直接上傳，請貼入 YouTube 或影片外部連結！');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('檔案大小不能超過 20MB');
      return;
    }

    const isImage = file.type.startsWith('image/');
    if (isImage) {
      setUploadingImage(true);
    } else {
      setUploadingFile(true);
    }
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', isImage ? 'image' : 'file');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '檔案上傳失敗');
      }

      if (isImage) {
        setAttachment({
          type: 'image',
          url: data.url,
          title: file.name,
        });
        setMediaType('image');
      } else {
        setAttachment({
          type: 'file',
          url: data.url,
          title: file.name,
          metadata: {
            fileName: data.fileName || file.name,
            fileSize: data.size || file.size,
            fileExtension: data.fileExtension || file.name.split('.').pop() || '',
            mimeType: data.mimeType || file.type,
          },
        });
        setMediaType('file');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '上傳失敗';
      setError(msg);
    } finally {
      if (isImage) {
        setUploadingImage(false);
      } else {
        setUploadingFile(false);
      }
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFileOrDocument(file);
    e.target.value = '';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFileOrDocument(file);
    e.target.value = '';
  };

  // 拖曳處理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFileOrDocument(files[0]);
    }
  };

  // 貼上事件 (Ctrl+V 支援直接貼上截圖照片)
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          await uploadFileOrDocument(file);
          return;
        }
      }
    }
  };

  // 智慧網址辨識：解析 YouTube 或一般網址縮圖
  const parseAndApplyUrl = async (urlStr: string) => {
    const trimmed = urlStr.trim();
    if (!trimmed) return;

    // 1. 檢查是否為 YouTube
    const ytId = extractYouTubeId(trimmed);
    if (ytId) {
      setAttachment({
        type: 'link',
        url: trimmed,
        title: 'YouTube 影片',
        metadata: {
          youtubeId: ytId,
          ogImage: getYouTubeThumbnail(ytId),
        },
      });
      setMediaType('link');
      return;
    }

    // 2. 一般網址，向後端 /api/og 抓取 OpenGraph 資訊
    setLoadingLinkPreview(true);
    try {
      const res = await fetch(`/api/og?url=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAttachment({
          type: 'link',
          url: trimmed,
          title: data.title || trimmed,
          metadata: {
            ogImage: data.image,
            ogTitle: data.title,
            ogDescription: data.description,
            favicon: data.favicon,
          },
        });
        setMediaType('link');
      } else {
        setAttachment({
          type: 'link',
          url: trimmed,
          title: trimmed,
        });
        setMediaType('link');
      }
    } catch {
      setAttachment({
        type: 'link',
        url: trimmed,
        title: trimmed,
      });
      setMediaType('link');
    } finally {
      setLoadingLinkPreview(false);
    }
  };

  // 當使用者在內容輸入框貼上或打字時，自動偵測網址
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    // 若使用者目前尚未指定圖片/錄音，且內文出現了新網址，自動抓取縮圖
    if (!attachment || attachment.type === 'link') {
      const urls = findUrls(val);
      if (urls.length > 0 && urls[0] !== attachment?.url) {
        parseAndApplyUrl(urls[0]);
      }
    }
  };

  // 錄音完成回呼
  const handleAudioReady = (url: string, duration: number) => {
    setAttachment({
      type: 'audio',
      url,
      metadata: { duration },
    });
    setMediaType('audio');
  };

  // 送出更新
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 若處於語音錄音模式，且有尚未手動點擊「使用這段錄音」的錄音紀錄，自動上傳為附件
    let finalAttachment = attachment;
    if (mediaType === 'audio' && audioRecorderRef.current && audioRecorderRef.current.hasPendingAudio()) {
      setSubmitting(true);
      setError(null);
      try {
        const audioRes = await audioRecorderRef.current.uploadCurrentAudio();
        if (audioRes) {
          finalAttachment = {
            type: 'audio',
            url: audioRes.url,
            metadata: { duration: audioRes.duration },
          };
          setAttachment(finalAttachment);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '自動上傳錄音失敗';
        setError(msg);
        setSubmitting(false);
        return;
      }
    }

    // 嘗試從網址輸入框或內容中自動解析網址附件
    if (!finalAttachment) {
      const rawUrl = linkInput.trim() || findUrls(content)[0] || findUrls(title)[0];
      if (rawUrl) {
        const ytId = extractYouTubeId(rawUrl);
        if (ytId) {
          finalAttachment = {
            type: 'link',
            url: rawUrl,
            title: 'YouTube 影片',
            metadata: {
              youtubeId: ytId,
              ogImage: getYouTubeThumbnail(ytId),
            },
          };
        } else {
          finalAttachment = {
            type: 'link',
            url: rawUrl,
            title: rawUrl,
          };
        }
      }
    }

    if (!content.trim() && !title.trim() && !finalAttachment) {
      setError('請至少輸入標題、內容或保留多媒體附件');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          title: title.trim(),
          content: content.trim(),
          color: selectedColor,
          sectionId: selectedSectionId || undefined,
          attachment: finalAttachment || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '更新失敗');
      }

      onPostUpdated(data.post);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '更新失敗';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{ backgroundColor: selectedColor }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className="rounded-3xl max-w-lg w-full max-h-[88vh] flex flex-col shadow-2xl border-2 border-black/20 overflow-hidden relative transition-colors duration-200"
      >
        {/* 拖曳圖片與檔案覆蓋提示層 */}
        {isDraggingFile && (
          <div className="absolute inset-0 z-40 bg-amber-500/90 text-white flex flex-col items-center justify-center p-6 text-center backdrop-blur-xs border-4 border-dashed border-white rounded-3xl animate-pulse pointer-events-none">
            <UploadCloud className="w-16 h-16 mb-2" />
            <p className="text-lg font-black">放開滑鼠立即上傳照片或教學檔案 (PDF/Word/PPT/ZIP) 📁</p>
            <p className="text-xs text-white/90 mt-1">支援照片、各類教學文件直接拖曳，或剪貼簿 Ctrl+V 貼上照片</p>
          </div>
        )}

        {/* 固定頂部標頭 */}
        <div className="px-5 py-3.5 bg-black/5 border-b border-black/10 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-black text-gray-950 tracking-tight leading-tight">
              編輯便籤 ✏️
            </h3>
            <p className="text-[11px] text-gray-800 font-semibold truncate max-w-xs sm:max-w-sm">
              作者：<span className="font-extrabold">{post.authorName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-700 hover:text-black hover:bg-black/10 active:bg-black/20 rounded-full transition"
            title="關閉視窗 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 可滾動表單主體 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-5 space-y-4 flex-1">
            {error && (
              <div className="p-2.5 rounded-xl bg-red-100 border border-red-300 text-xs text-red-900 font-bold">
                {error}
              </div>
            )}

            {/* 主題分類選擇器 */}
            {sections.length > 0 && (
              <div>
                <label className="block text-xs font-black text-gray-950 mb-1 flex items-center gap-1">
                  <Folder className="w-3.5 h-3.5 text-amber-700" />
                  <span>所屬主題分類</span>
                </label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full text-sm font-bold bg-white text-gray-950 border-2 border-gray-400 rounded-xl px-3.5 py-2.5 outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200 shadow-xs"
                >
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 標題 */}
            <div>
              <label className="block text-xs font-black text-gray-950 mb-1">
                卡片標題（選填）
              </label>
              <input
                type="text"
                placeholder="例如：操場邊發現的奇特植物..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full font-black text-base bg-white text-gray-950 placeholder:text-gray-500 border-2 border-gray-400 rounded-xl px-3.5 py-2.5 outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200 shadow-xs"
              />
            </div>

            {/* 內文 */}
            <div>
              <label className="block text-xs font-black text-gray-950 mb-1">
                內容心得 *
              </label>
              <textarea
                rows={4}
                placeholder="寫下你的觀察、想法或心得，貼入網址將自動顯示縮圖..."
                value={content}
                onChange={handleContentChange}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  if (pasted) {
                    const urls = findUrls(pasted);
                    if (urls.length > 0 && (!attachment || attachment.type === 'link')) {
                      parseAndApplyUrl(urls[0]);
                    }
                  }
                }}
                className="w-full text-sm font-bold bg-white text-gray-950 placeholder:text-gray-500 border-2 border-gray-400 rounded-xl px-3.5 py-3 outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200 shadow-xs resize-none"
              />
              <p className="text-[11px] text-gray-700 font-medium mt-1">
                💡 貼入 YouTube 影片或一般網頁連結，將自動偵測並呈現網址縮圖與可點擊連結！
              </p>
            </div>

            {/* 便籤顏色挑選 */}
            <div className="flex items-center gap-2 bg-white/60 p-2.5 rounded-2xl border border-black/10">
              <span className="text-xs font-black text-gray-950 mr-1">便籤顏色：</span>
              <div className="flex items-center gap-2">
                {PASTEL_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setSelectedColor(c.value)}
                    style={{ backgroundColor: c.value }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      selectedColor === c.value
                        ? 'scale-125 border-gray-950 ring-2 ring-amber-500 shadow-md'
                        : 'border-black/20 hover:scale-110'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* 多媒體工具按鈕列 */}
            <div className="pt-2 border-t border-black/15 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {/* 圖片上傳按鈕 */}
                <label
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black cursor-pointer transition shadow-xs ${
                    mediaType === 'image'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{uploadingImage ? '上傳中...' : '拖曳/更換照片'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    disabled={uploadingImage || uploadingFile}
                    className="hidden"
                  />
                </label>

                {/* 檔案/PDF 上傳按鈕 */}
                <label
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black cursor-pointer transition shadow-xs ${
                    mediaType === 'file'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
                  }`}
                >
                  <Paperclip className="w-4 h-4" />
                  <span>{uploadingFile ? '上傳中...' : '檔案/PDF'}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.odp,.ods,.txt,.zip,.rar,.7z,.mp3,.m4a,.wav"
                    onChange={handleFileSelect}
                    disabled={uploadingImage || uploadingFile}
                    className="hidden"
                  />
                </label>

                {/* 錄音按鈕 */}
                <button
                  type="button"
                  onClick={() => setMediaType(mediaType === 'audio' ? 'none' : 'audio')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition shadow-xs ${
                    mediaType === 'audio'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  <span>語音錄音</span>
                </button>

                {/* 連結按鈕 */}
                <button
                  type="button"
                  onClick={() => setMediaType(mediaType === 'link' ? 'none' : 'link')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition shadow-xs ${
                    mediaType === 'link'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>連結/YouTube</span>
                </button>
              </div>
            </div>

            {/* 展開之錄音組件 */}
            {mediaType === 'audio' && (
              <AudioRecorder
                ref={audioRecorderRef}
                onAudioReady={handleAudioReady}
                onReset={() => {
                  if (attachment?.type === 'audio') {
                    setAttachment(undefined);
                  }
                }}
                onCancel={() => {
                  setMediaType('none');
                  setAttachment(undefined);
                }}
              />
            )}

            {/* 展開之網址輸入組件 */}
            {mediaType === 'link' && (
              <div className="bg-white p-3.5 rounded-2xl border-2 border-gray-300 space-y-2 shadow-xs">
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="貼上 YouTube 影片網址或網頁連結..."
                    value={linkInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLinkInput(val);
                      const urls = findUrls(val);
                      if (urls.length > 0) {
                        parseAndApplyUrl(urls[0]);
                      } else if (val.trim().startsWith('http://') || val.trim().startsWith('https://')) {
                        parseAndApplyUrl(val.trim());
                      }
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      if (pasted) {
                        const urls = findUrls(pasted);
                        if (urls.length > 0) {
                          parseAndApplyUrl(urls[0]);
                        } else if (pasted.trim().startsWith('http://') || pasted.trim().startsWith('https://')) {
                          parseAndApplyUrl(pasted.trim());
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        parseAndApplyUrl(linkInput);
                      }
                    }}
                    className="flex-1 text-xs font-bold bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 outline-hidden focus:border-amber-600 text-gray-950"
                  />
                  <button
                    type="button"
                    onClick={() => parseAndApplyUrl(linkInput)}
                    disabled={loadingLinkPreview}
                    className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-black shadow-xs flex items-center gap-1"
                  >
                    {loadingLinkPreview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>{loadingLinkPreview ? '解析中...' : '解析縮圖'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-gray-600 font-medium">
                  💡 貼上 YouTube 網址會自動抓取影片縮圖，貼上一般網頁亦會自動抓取網站縮圖！
                </p>
              </div>
            )}

            {/* 附件縮圖與預覽區塊 */}
            {attachment && (
              <div className="space-y-2">
                <div className="text-xs font-black text-gray-900 flex items-center justify-between">
                  <span>多媒體附件預覽：</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachment(undefined);
                      setMediaType('none');
                    }}
                    className="text-red-600 hover:text-red-800 text-xs font-bold"
                  >
                    移除附件
                  </button>
                </div>

                {attachment.type === 'link' && (
                  <LinkPreviewCard
                    attachment={attachment}
                    canRemove={true}
                    onRemove={() => {
                      setAttachment(undefined);
                      setMediaType('none');
                    }}
                  />
                )}

                {attachment.type === 'image' && (
                  <div className="rounded-2xl border-2 border-emerald-500 overflow-hidden bg-white shadow-xs relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={attachment.url} alt="照片" className="w-full max-h-56 object-cover" />
                    <div className="p-2.5 flex items-center justify-between bg-white/95 text-xs font-bold">
                      <span className="truncate text-emerald-900 flex items-center gap-1">
                        <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{attachment.title || '照片附件'}</span>
                      </span>
                    </div>
                  </div>
                )}

                {attachment.type === 'audio' && (
                  <div className="p-3 rounded-2xl bg-white border-2 border-amber-400 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-5 h-5 text-amber-600" />
                      <span className="text-xs font-bold text-gray-800">語音錄音檔已附加</span>
                    </div>
                  </div>
                )}

                {attachment.type === 'file' && (
                  <FileAttachmentCard
                    attachment={attachment}
                    canRemove={true}
                    onRemove={() => {
                      setAttachment(undefined);
                      setMediaType('none');
                    }}
                  />
                )}

                {/* 顯示內文中額外偵測到的連結縮圖 (例如第二個連結) */}
                {extraLinksFromContent.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-black/10">
                    <p className="text-[11px] text-gray-600 font-bold">💡 內文同時包含之連結預覽縮圖：</p>
                    {extraLinksFromContent.slice(0, 1).map((extraLink, idx) => (
                      <LinkPreviewCard key={`${extraLink.url}-${idx}`} attachment={extraLink} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 若無主附件，但內文中有偵測到多個連結時之預覽 */}
            {!attachment && extraLinksFromContent.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-black text-gray-900">🔗 內文網址縮圖預覽：</p>
                <div className="space-y-2">
                  {extraLinksFromContent.slice(0, 2).map((linkAtt, idx) => (
                    <LinkPreviewCard key={`${linkAtt.url}-${idx}`} attachment={linkAtt} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 底部操作欄 */}
          <div className="px-5 py-3 bg-black/5 border-t border-black/10 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/90 hover:bg-white text-gray-800 text-xs font-bold transition shadow-xs"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingImage || uploadingFile}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-black shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>儲存中...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>儲存變更 💾</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
