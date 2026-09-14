import { NextRequest, NextResponse } from 'next/server';
import { isR2Configured, uploadToR2 } from '@/lib/storage/r2';

const EXT_MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  odt: 'application/vnd.oasis.opendocument.text',
  odp: 'application/vnd.oasis.opendocument.presentation',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  zip: 'application/zip',
  rar: 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',
  txt: 'text/plain',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  aac: 'audio/aac',
  webm: 'audio/webm',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fileType = (formData.get('type') as string) || 'image'; // 'image' | 'audio' | 'document' | 'file'

    if (!file) {
      return NextResponse.json({ error: '未提供檔案' }, { status: 400 });
    }

    const mime = file.type.toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    // 嚴格拒絕影片直接上傳（影片請使用外部 YouTube 連結）
    if (mime.startsWith('video/')) {
      return NextResponse.json(
        { error: '為保障系統效能與頻寬，不支援影片直接上傳，請使用外部 YouTube 連結！' },
        { status: 400 }
      );
    }

    // 檢查大小 (上限 20MB)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: '檔案大小超過 20MB 限制，請壓縮或縮減後再上傳' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 決定有效的 MIME 類型
    let effectiveMime = mime;
    if (!effectiveMime || effectiveMime === 'application/octet-stream') {
      effectiveMime = EXT_MIME_MAP[ext] || 'application/octet-stream';
    }

    // 決定 R2 目錄
    let targetFolder: 'images' | 'audio' | 'documents' = 'documents';
    if (fileType === 'audio' || ['mp3', 'm4a', 'wav', 'aac', 'webm'].includes(ext)) {
      targetFolder = 'audio';
    } else if (fileType === 'image' || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
      targetFolder = 'images';
    }

    // 1. 若已設定 Cloudflare R2，優先直接上傳至 R2 取得免流量 CDN 網址
    if (isR2Configured()) {
      try {
        const r2Url = await uploadToR2({
          buffer,
          mime: effectiveMime,
          originalName: file.name,
          folder: targetFolder,
        });

        return NextResponse.json({
          success: true,
          url: r2Url,
          storage: 'cloudflare_r2',
          fileName: file.name,
          fileExtension: ext,
          size: file.size,
          mimeType: effectiveMime,
        });
      } catch (r2Err) {
        console.error('Cloudflare R2 upload error, falling back to Data URL:', r2Err);
      }
    }

    // 2. 備援回退機制：轉為 Base64 Data URL (保證在未設定 R2 時依然正常運作)
    const dataUrl = `data:${effectiveMime};base64,${buffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      storage: 'base64_fallback',
      fileName: file.name,
      fileExtension: ext,
      size: file.size,
      mimeType: effectiveMime,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '上傳失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
