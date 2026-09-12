'use client';

import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ZoomControllerProps {
  zoom: number; // 50 to 150
  onZoomChange: (newZoom: number) => void;
  onResetZoom: () => void;
  minZoom?: number;
  maxZoom?: number;
  step?: number;
}

export function ZoomController({
  zoom,
  onZoomChange,
  onResetZoom,
  minZoom = 50,
  maxZoom = 150,
  step = 10,
}: ZoomControllerProps) {
  const canZoomOut = zoom > minZoom;
  const canZoomIn = zoom < maxZoom;

  const handleZoomOut = () => {
    if (canZoomOut) {
      onZoomChange(Math.max(minZoom, zoom - step));
    }
  };

  const handleZoomIn = () => {
    if (canZoomIn) {
      onZoomChange(Math.min(maxZoom, zoom + step));
    }
  };

  return (
    <aside
      aria-label="看板畫面縮放控制"
      className="fixed bottom-6 right-6 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-xl rounded-full p-1.5 flex items-center gap-1 transition-all duration-200 hover:shadow-2xl"
    >
      {/* 縮小按鈕 */}
      <button
        type="button"
        disabled={!canZoomOut}
        onClick={handleZoomOut}
        title="縮小看板畫面 (-10%，或按住 Ctrl + 滾輪向下)"
        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-amber-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      {/* 比例顯示與一鍵還原按鈕 */}
      <button
        type="button"
        onClick={onResetZoom}
        title="目前縮放比例（點擊立即還原 100%）"
        className="px-2.5 py-1 rounded-full text-xs font-black text-gray-900 dark:text-gray-100 hover:bg-amber-100 dark:hover:bg-slate-800 transition flex items-center gap-1 group"
      >
        <span>{zoom}%</span>
        {zoom !== 100 && (
          <RotateCcw className="w-3 h-3 text-amber-600 opacity-70 group-hover:opacity-100 transition-opacity" />
        )}
      </button>

      {/* 放大按鈕 */}
      <button
        type="button"
        disabled={!canZoomIn}
        onClick={handleZoomIn}
        title="放大看板畫面 (+10%，或按住 Ctrl + 滾輪向上)"
        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-amber-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
    </aside>
  );
}
