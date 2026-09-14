'use client';

import React from 'react';
import { MediaAttachment } from '@/types';
import {
  FileText,
  File,
  Presentation,
  Table,
  Archive,
  Music,
  Download,
  ExternalLink,
  X,
} from 'lucide-react';

interface FileAttachmentCardProps {
  attachment: MediaAttachment;
  canRemove?: boolean;
  onRemove?: () => void;
  compact?: boolean;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileInfo(attachment: MediaAttachment) {
  const fileName =
    attachment.metadata?.fileName ||
    attachment.title ||
    attachment.url.split('/').pop()?.split('?')[0] ||
    '檔案附件';

  const ext = (
    attachment.metadata?.fileExtension ||
    fileName.split('.').pop() ||
    ''
  ).toLowerCase();

  if (ext === 'pdf') {
    return {
      type: 'pdf',
      label: 'PDF 文件',
      badgeClass: 'bg-red-600 text-white',
      borderClass: 'border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30',
      iconClass: 'text-red-600 dark:text-red-400',
      icon: FileText,
      canPreviewOnline: true,
    };
  }

  if (['doc', 'docx', 'odt'].includes(ext)) {
    return {
      type: 'word',
      label: ext.toUpperCase() + ' 文件',
      badgeClass: 'bg-blue-600 text-white',
      borderClass: 'border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30',
      iconClass: 'text-blue-600 dark:text-blue-400',
      icon: FileText,
      canPreviewOnline: false,
    };
  }

  if (['ppt', 'pptx', 'odp'].includes(ext)) {
    return {
      type: 'presentation',
      label: ext.toUpperCase() + ' 簡報',
      badgeClass: 'bg-orange-600 text-white',
      borderClass: 'border-orange-200 dark:border-orange-900/60 bg-orange-50/70 dark:bg-orange-950/30',
      iconClass: 'text-orange-600 dark:text-orange-400',
      icon: Presentation,
      canPreviewOnline: false,
    };
  }

  if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) {
    return {
      type: 'spreadsheet',
      label: ext.toUpperCase() + ' 試算表',
      badgeClass: 'bg-emerald-600 text-white',
      borderClass: 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30',
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      icon: Table,
      canPreviewOnline: false,
    };
  }

  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return {
      type: 'archive',
      label: '壓縮檔案 (' + ext.toUpperCase() + ')',
      badgeClass: 'bg-amber-600 text-white',
      borderClass: 'border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30',
      iconClass: 'text-amber-600 dark:text-amber-400',
      icon: Archive,
      canPreviewOnline: false,
    };
  }

  if (['mp3', 'm4a', 'wav', 'aac', 'ogg', 'flac'].includes(ext)) {
    return {
      type: 'audio',
      label: '音訊檔案 (' + ext.toUpperCase() + ')',
      badgeClass: 'bg-purple-600 text-white',
      borderClass: 'border-purple-200 dark:border-purple-900/60 bg-purple-50/70 dark:bg-purple-950/30',
      iconClass: 'text-purple-600 dark:text-purple-400',
      icon: Music,
      canPreviewOnline: true,
      isAudioPlayer: true,
    };
  }

  return {
    type: 'generic',
    label: ext ? ext.toUpperCase() + ' 檔案' : '附件檔案',
    badgeClass: 'bg-slate-600 text-white',
    borderClass: 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40',
    iconClass: 'text-slate-600 dark:text-slate-400',
    icon: File,
    canPreviewOnline: false,
  };
}

export function FileAttachmentCard({
  attachment,
  canRemove = false,
  onRemove,
  compact = false,
}: FileAttachmentCardProps) {
  const fileInfo = getFileInfo(attachment);
  const Icon = fileInfo.icon;
  const fileName =
    attachment.metadata?.fileName ||
    attachment.title ||
    attachment.url.split('/').pop()?.split('?')[0] ||
    '檔案附件';
  const fileSizeStr = formatFileSize(attachment.metadata?.fileSize);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`rounded-2xl border ${fileInfo.borderClass} p-3.5 sm:p-4 transition-all duration-150 shadow-2xs relative group`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* 左側圖示與檔案資訊 */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-xs shrink-0 ${fileInfo.iconClass}`}>
            <Icon className="w-6 h-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${fileInfo.badgeClass}`}>
                {fileInfo.label}
              </span>
              {fileSizeStr && (
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                  {fileSizeStr}
                </span>
              )}
            </div>

            <h5
              className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-gray-100 truncate"
              title={fileName}
            >
              {fileName}
            </h5>

            {/* 音訊檔案直接內嵌撥放器 */}
            {fileInfo.type === 'audio' && attachment.url && (
              <div className="mt-2 w-full">
                <audio controls src={attachment.url} className="w-full h-8" />
              </div>
            )}
          </div>
        </div>

        {/* 右側按鈕群組 */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {/* 下載/開啟按鈕 */}
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            download={fileName}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 text-xs font-black shadow-2xs transition"
            title={fileInfo.canPreviewOnline ? '在新分頁開啟閱讀 / 播放' : '下載檔案'}
          >
            {fileInfo.canPreviewOnline ? (
              <>
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{fileInfo.type === 'pdf' ? '閱讀' : '預覽'}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">下載</span>
              </>
            )}
          </a>

          {/* 移除按鈕（在編輯視窗中可見） */}
          {canRemove && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
              title="移除此檔案"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
