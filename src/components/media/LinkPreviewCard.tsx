'use client';

import React, { useState, useEffect } from 'react';
import { MediaAttachment } from '@/types';
import { ExternalLink, Play, Globe, X } from 'lucide-react';
import { getYouTubeThumbnail, extractYouTubeId } from '@/lib/media';

interface LinkPreviewCardProps {
  attachment: MediaAttachment;
  onRemove?: () => void;
  canRemove?: boolean;
}

export function LinkPreviewCard({ attachment, onRemove, canRemove = false }: LinkPreviewCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const metadata = attachment.metadata || {};
  const youtubeId = metadata.youtubeId || extractYouTubeId(attachment.url);

  // 一般網頁動態補抓縮圖 (若發布時未先抓取)
  const [ogData, setOgData] = useState<{
    image?: string;
    title?: string;
    description?: string;
    favicon?: string;
  } | null>(
    metadata.ogImage || metadata.ogTitle
      ? {
          image: metadata.ogImage,
          title: metadata.ogTitle,
          description: metadata.ogDescription,
          favicon: metadata.favicon,
        }
      : null
  );

  useEffect(() => {
    if (!youtubeId && !metadata.ogImage && !metadata.ogTitle && attachment.url) {
      fetch(`/api/og?url=${encodeURIComponent(attachment.url)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) {
            setOgData({
              image: data.image,
              title: data.title,
              description: data.description,
              favicon: data.favicon,
            });
          }
        })
        .catch(() => {});
    }
  }, [attachment.url, youtubeId, metadata.ogImage, metadata.ogTitle]);

  // 1. YouTube 影片連結卡片
  if (youtubeId) {
    const thumbnailUrl = metadata.ogImage || getYouTubeThumbnail(youtubeId);

    if (isPlaying) {
      return (
        <div className="relative rounded-2xl overflow-hidden border border-black/10 bg-black shadow-sm aspect-video w-full">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
            title={attachment.title || 'YouTube Video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
          {canRemove && onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition shadow-md z-10"
              title="移除影片"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="relative rounded-2xl overflow-hidden border border-black/10 bg-white dark:bg-slate-900 shadow-sm group">
        {/* 縮圖區域 */}
        <div
          onClick={() => setIsPlaying(true)}
          className="relative aspect-video w-full bg-slate-900 cursor-pointer overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt={attachment.title || 'YouTube 縮圖'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* 漸層與 YouTube 經典播放按鈕 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/30 flex items-center justify-center">
            <div className="w-14 h-10 rounded-2xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-2xl transition transform group-hover:scale-110">
              <Play className="w-5 h-5 fill-white ml-0.5" />
            </div>
          </div>

          {/* 標籤 */}
          <span className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            YouTube 影片
          </span>
        </div>

        {/* 底部說明與外部連結按鈕 */}
        <div className="p-3 flex items-center justify-between gap-2 bg-white dark:bg-slate-900">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
              {attachment.title || 'YouTube 影片'}
            </p>
            <p className="text-[10px] text-gray-500 truncate mt-0.5">點擊縮圖原地播放，或點右側前往觀看</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-300 text-[11px] font-bold transition"
              title="在 YouTube 開啟"
            >
              <span>前往觀看</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            {canRemove && onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="移除"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. 一般網址縮圖與預覽卡片 (OpenGraph)
  const displayImage = ogData?.image || metadata.ogImage;
  const displayTitle = ogData?.title || metadata.ogTitle || attachment.title;
  const displayDesc = ogData?.description || metadata.ogDescription;
  const displayFavicon = ogData?.favicon || metadata.favicon;

  let domain = '';
  try {
    domain = new URL(attachment.url).hostname;
  } catch {
    domain = attachment.url;
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-black/10 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all group relative">
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="block"
      >
        {/* 縮圖（若有擷取到） */}
        {displayImage && (
          <div className="relative w-full h-36 bg-gray-100 dark:bg-slate-800 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImage}
              alt={displayTitle || '網頁縮圖'}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* 內文資訊 */}
        <div className="p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-semibold mb-1">
            {displayFavicon ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={displayFavicon} alt="" className="w-3.5 h-3.5 rounded-xs shrink-0" onError={(e) => ((e.target as HTMLElement).style.display = 'none')} />
            ) : (
              <Globe className="w-3.5 h-3.5 shrink-0 text-gray-400" />
            )}
            <span className="truncate">{domain}</span>
            <ExternalLink className="w-3 h-3 ml-auto opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
          </div>

          <h5 className="text-xs font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug group-hover:text-amber-800 dark:group-hover:text-amber-400 transition-colors">
            {displayTitle || domain}
          </h5>

          {displayDesc && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 leading-relaxed">
              {displayDesc}
            </p>
          )}
        </div>
      </a>

      {canRemove && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 text-gray-600 hover:text-red-600 hover:bg-white shadow-xs transition"
          title="移除連結"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
