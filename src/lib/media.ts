/**
 * 鹿鳴牆 多媒體與網址處理工具庫
 */

// 提取 YouTube 11 碼影片 ID (支援 watch?v=, youtu.be/, shorts/, live/, embed/)
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?(?:.*&)?v=|shorts\/|live\/))([\w-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

// 取得 YouTube 預設高畫質縮圖網址
export function getYouTubeThumbnail(youtubeId: string): string {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

// 驗證字串是否為合法 HTTP(S) 網址
export function isValidUrl(string: string): boolean {
  try {
    const parsed = new URL(string);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// 從文字中尋找所有 HTTP / HTTPS 網址
export function findUrls(text: string): string[] {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
  const matches = text.match(urlRegex);
  if (!matches) return [];
  // 移除尾端可能誤抓的標點符號 (如句號、逗號、括號等)
  return matches.map((u) => u.replace(/[.,;!?)]+$/, ''));
}

// 解碼 HTML 實體字元（如 &#39; -> '）
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}
