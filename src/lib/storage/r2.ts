import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || 'ca5d155a8d1dcb2a9ee6770606e12a15';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '8558bea706a171f2ba5a93448426b5fd';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '0686c35f7ca2dee6683abf79af880d3b11e7e3c16c263c0398e0ef32ef076a05';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'luwall-media';
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || 'https://pub-2fc70d0fa2a84eb29a162b30ab78970f.r2.dev';

export function isR2Configured(): boolean {
  return Boolean(
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_NAME &&
    R2_PUBLIC_DOMAIN
  );
}

let s3ClientInstance: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    if (!isR2Configured()) {
      throw new Error('Cloudflare R2 is not fully configured in environment variables');
    }
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3ClientInstance;
}

export interface UploadOptions {
  buffer: Buffer;
  mime: string;
  originalName: string;
  folder?: 'images' | 'audio' | 'documents';
}

export async function uploadToR2(options: UploadOptions): Promise<string> {
  const { buffer, mime, originalName, folder = 'images' } = options;
  const client = getS3Client();

  const ext = originalName.includes('.') ? originalName.split('.').pop() : (folder === 'audio' ? 'webm' : 'jpg');
  const cleanExt = ext ? `.${ext.toLowerCase()}` : '';
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const key = `${folder}/${Date.now()}-${randomSuffix}${cleanExt}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: mime,
  });

  await client.send(command);

  // 整理公開網址 (去除末尾斜線)
  const baseDomain = R2_PUBLIC_DOMAIN!.replace(/\/+$/, '');
  return `${baseDomain}/${key}`;
}
