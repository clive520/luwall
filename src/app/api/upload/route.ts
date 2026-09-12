import { NextRequest, NextResponse } from 'next/server';
import { isR2Configured, uploadToR2 } from '@/lib/storage/r2';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fileType = (formData.get('type') as string) || 'image'; // 'image' | 'audio'

    if (!file) {
      return NextResponse.json({ error: '未提供檔案' }, { status: 400 });
    }

    const mime = file.type.toLowerCase();

    // 嚴格拒絕影片上傳
    if (mime.startsWith('video/')) {
      return NextResponse.json(
        { error: '為保障流暢度與儲存空間，系統不支援影片直接上傳，請使用外部 YouTube 連結！' },
        { status: 400 }
      );
    }

    // 檢查大小 (上限 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: '檔案大小超過 5MB 限制，請縮減後再上傳' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const effectiveMime = mime || (fileType === 'audio' ? 'audio/webm' : 'image/jpeg');

    // 1. 若已設定 Cloudflare R2，優先直接上傳至 R2 取得免流量 CDN 網址
    if (isR2Configured()) {
      try {
        const r2Url = await uploadToR2({
          buffer,
          mime: effectiveMime,
          originalName: file.name,
          folder: fileType === 'audio' ? 'audio' : 'images',
        });

        return NextResponse.json({
          success: true,
          url: r2Url,
          storage: 'cloudflare_r2',
          fileName: file.name,
          size: file.size,
        });
      } catch (r2Err) {
        console.error('Cloudflare R2 upload error, falling back to Data URL:', r2Err);
      }
    }

    // 2. 備援回退機制：轉為 Base64 Data URL (保證在未設定 R2 時依然 100% 正常運作)
    const dataUrl = `data:${effectiveMime};base64,${buffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      storage: 'base64_fallback',
      fileName: file.name,
      size: file.size,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '上傳失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
