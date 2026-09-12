import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

    // 產生唯一檔名
    const ext = path.extname(file.name) || (fileType === 'audio' ? '.webm' : '.jpg');
    const safeFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, safeFileName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${safeFileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
      size: file.size,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '上傳失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
