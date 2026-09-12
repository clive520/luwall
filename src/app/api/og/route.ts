import { NextRequest, NextResponse } from 'next/server';
import { extractYouTubeId, getYouTubeThumbnail, decodeHtmlEntities } from '@/lib/media';

// SSRF 防護：禁止私有與迴圈 IP
function isPrivateHost(hostname: string): boolean {
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0'
  ) {
    return true;
  }
  if (
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    /^169\.254\./.test(hostname)
  ) {
    return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: '缺少 url 參數' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json({ error: '僅支援 HTTP 或 HTTPS 網址' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: '無效的網址格式' }, { status: 400 });
  }

  if (isPrivateHost(parsed.hostname)) {
    return NextResponse.json({ error: '不允許存取私有位址' }, { status: 403 });
  }

  // 若為 YouTube 網址，直接快速回傳高畫質縮圖
  const ytId = extractYouTubeId(targetUrl);
  if (ytId) {
    return NextResponse.json(
      {
        success: true,
        isYouTube: true,
        youtubeId: ytId,
        title: 'YouTube 影片',
        image: getYouTubeThumbnail(ytId),
        url: targetUrl,
        siteName: 'YouTube',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        },
      }
    );
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: AbortSignal.timeout(4000),
      redirect: 'follow',
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return NextResponse.json({
        success: true,
        title: parsed.hostname,
        url: targetUrl,
        siteName: parsed.hostname,
      });
    }

    const html = await res.text();

    // OG Image
    const ogImageMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

    // OG Title
    const ogTitleMatch =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i);

    // OG Description
    const ogDescMatch =
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i) ||
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);

    // OG Site Name
    const ogSiteNameMatch =
      html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i);

    // Favicon
    const faviconMatch =
      html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i) ||
      html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i);

    let image = ogImageMatch ? ogImageMatch[1].trim() : null;
    if (image) {
      try {
        image = new URL(image, targetUrl).href;
      } catch {
        image = null;
      }
    }

    let favicon = faviconMatch ? faviconMatch[1].trim() : null;
    if (favicon) {
      try {
        favicon = new URL(favicon, targetUrl).href;
      } catch {
        favicon = null;
      }
    } else {
      favicon = `${parsed.protocol}//${parsed.host}/favicon.ico`;
    }

    const title = ogTitleMatch ? decodeHtmlEntities(ogTitleMatch[1].trim()) : parsed.hostname;
    const description = ogDescMatch ? decodeHtmlEntities(ogDescMatch[1].trim().slice(0, 200)) : null;
    const siteName = ogSiteNameMatch ? decodeHtmlEntities(ogSiteNameMatch[1].trim()) : parsed.hostname;

    return NextResponse.json(
      {
        success: true,
        title,
        description,
        image,
        siteName,
        favicon,
        url: targetUrl,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        },
      }
    );
  } catch (err: unknown) {
    return NextResponse.json({
      success: true,
      title: parsed.hostname,
      url: targetUrl,
      siteName: parsed.hostname,
      favicon: `${parsed.protocol}//${parsed.host}/favicon.ico`,
    });
  }
}
