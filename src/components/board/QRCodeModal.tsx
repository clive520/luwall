'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, ExternalLink } from 'lucide-react';

interface QRCodeModalProps {
  boardTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function QRCodeModal({ boardTitle, isOpen, onClose }: QRCodeModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      setCurrentUrl(url);
      QRCode.toDataURL(url, { width: 320, margin: 2 })
        .then((dataUrl) => setQrCodeUrl(dataUrl))
        .catch(console.error);
    }
  }, [isOpen]);

  // 支援 ESC 鍵關閉
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-amber-100 relative text-center"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 mb-3">
          <span className="text-2xl">📱</span>
        </div>

        <h3 className="text-xl font-black text-gray-900 mb-1">課堂快速加入</h3>
        <p className="text-sm text-gray-500 mb-5 line-clamp-1">{boardTitle}</p>

        {/* QR Code 呈現 */}
        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 inline-block shadow-inner mb-4">
          {qrCodeUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={qrCodeUrl}
              alt="Board QR Code"
              className="w-64 h-64 mx-auto rounded-xl shadow-xs"
            />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center text-gray-400 text-sm">
              產生 QR Code 中...
            </div>
          )}
        </div>

        <p className="text-xs text-amber-800 font-medium mb-4">
          請學生用平板或手機相機掃描上方 QR Code，即可直接連線發表！
        </p>

        {/* 複製連結列 */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2 text-left">
          <input
            type="text"
            readOnly
            value={currentUrl}
            className="text-xs text-gray-600 bg-transparent flex-1 outline-hidden px-2 select-all"
          />
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '已複製' : '複製'}</span>
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <ExternalLink className="w-3.5 h-3.5" />
          <span>鹿陽國小學生亦可於登入後自動保留個人發表歷程</span>
        </div>
      </div>
    </div>
  );
}
