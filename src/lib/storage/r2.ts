import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN;

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
  folder?: 'images' | 'audio';
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
