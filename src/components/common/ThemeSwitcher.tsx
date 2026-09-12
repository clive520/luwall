'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppTheme, THEME_OPTIONS, AppTheme } from '@/contexts/ThemeContext';
import { Palette, Check } from 'lucide-react';

export function ThemeSwitcher() {
  const { theme, setTheme } = useAppTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200/80 text-gray-800 text-xs font-bold transition border border-black/10 shadow-2xs"
        title="切換色彩主題"
      >
        <Palette className="w-3.5 h-3.5 text-amber-600" />
        <span className="hidden sm:inline">{currentOption.icon} {currentOption.name}</span>
        <span className="sm:hidden">{currentOption.icon}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-200/90 py-2 z-50 animate-fade-in">
          <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 border-b border-gray-100 mb-1">
            🎨 選擇視覺主題配色
          </div>

          <div className="space-y-1 px-1.5">
            {THEME_OPTIONS.map((opt) => {
              const isSelected = opt.id === theme;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setTheme(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition ${
                    isSelected
                      ? 'bg-amber-50 text-amber-900 border border-amber-200'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{opt.icon}</span>
                    <div className="text-left">
                      <div className="leading-none mb-0.5">{opt.name}</div>
                      <div className="text-[10px] text-gray-400 font-normal">
                        {opt.badge}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* 色票圓圈預覽 */}
                    <span
                      style={{ backgroundColor: opt.previewBg }}
                      className="w-4 h-4 rounded-full border border-gray-300 shadow-2xs"
                    />
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
