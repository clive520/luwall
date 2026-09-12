'use client';

import React, { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';

interface LinkifiedTextProps {
  text: string;
  className?: string;
}

// 匹配 http:// 或 https:// 網址 (靜態正規表示式，避免每次重繪重新實例化)
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^\`[\]]+)/g;

export function LinkifiedText({ text, className = '' }: LinkifiedTextProps) {
  const parts = useMemo(() => {
    if (!text) return [];
    return text.split(URL_REGEX);
  }, [text]);

  if (!text) return null;

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.match(/^https?:\/\//i)) {
          // 清除網址尾端標點符號，避免影響超連結目標
          const cleanUrl = part.replace(/[.,;!?)]+$/, '');
          const trailingPunctuation = part.slice(cleanUrl.length);

          return (
            <React.Fragment key={index}>
              <a
                href={cleanUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-blue-600 dark:text-sky-400 hover:text-blue-800 dark:hover:text-sky-300 underline underline-offset-2 break-all inline-flex items-center gap-0.5 font-bold transition mx-0.5"
                title={`開啟連結：${cleanUrl}`}
              >
                <span>{cleanUrl}</span>
                <ExternalLink className="w-3 h-3 inline-block shrink-0 opacity-70" />
              </a>
              {trailingPunctuation}
            </React.Fragment>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}
