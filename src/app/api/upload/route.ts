import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fileType = formData.get('type') as string; // 'image' | 'audio'

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

    // 在 Vercel Serverless 環境下，使用 Base64 Data URL 可保證跨實例永久可讀且免外掛儲存空間
    const effectiveMime = mime || (fileType === 'audio' ? 'audio/webm' : 'image/jpeg');
    const dataUrl = `data:${effectiveMime};base64,${buffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      fileName: file.name,
      size: file.size,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '上傳失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
