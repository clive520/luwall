'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'day' | 'night' | 'sepia' | 'emerald' | 'ocean';

export interface ThemeOption {
  id: AppTheme;
  name: string;
  badge: string;
  previewBg: string;
  previewText: string;
  icon: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'day',
    name: '白天模式',
    badge: '清爽亮白',
    previewBg: '#ffffff',
    previewText: '#0f172a',
    icon: '☀️',
  },
  {
    id: 'night',
    name: '黑夜模式',
    badge: '深邃暗夜',
    previewBg: '#0f172a',
    previewText: '#f8fafc',
    icon: '🌙',
  },
  {
    id: 'sepia',
    name: '柔和護眼',
    badge: '溫潤羊皮紙',
    previewBg: '#fbf0d9',
    previewText: '#451a03',
    icon: '📖',
  },
  {
    id: 'emerald',
    name: '青翠綠',
    badge: '大自然活力',
    previewBg: '#ecfdf5',
    previewText: '#064e3b',
    icon: '🌿',
  },
  {
    id: 'ocean',
    name: '深海藍',
    badge: '沉靜專注',
    previewBg: '#0f1f38',
    previewText: '#e0f2fe',
    icon: '🌊',
  },
];

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'day',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('day');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('luwall_theme') as AppTheme;
    if (saved && ['day', 'night', 'sepia', 'emerald', 'ocean'].includes(saved)) {
      setThemeState(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      document.documentElement.setAttribute('data-theme', 'day');
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('luwall_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={`theme-${theme} min-h-screen transition-colors duration-200`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
