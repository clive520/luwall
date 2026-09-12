import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const encoder = new TextEncoder();

  const customReadable = new ReadableStream({
    async start(controller) {
      await db.ensureHydrated();
      // 首次發送目前所有 approved 貼文
      const initialPosts = db.getPostsByBoardId(id, false);
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'sync', posts: initialPosts })}\n\n`)
      );

      // 計算貼文內容、讚數、留言數與時間戳的特徵簽名
      const computeSignature = (posts: typeof initialPosts) =>
        posts
          .map((p) => `${p.id}:${p.updatedAt}:${p.likeCount}:${p.commentCount}:${p.status}`)
          .join('|');

      let lastSignature = computeSignature(initialPosts);

      // 設定定時心跳與資料變更檢查（3秒間隔）
      const interval = setInterval(async () => {
        try {
          await db.ensureHydrated();
          const currentPosts = db.getPostsByBoardId(id, false);
          const currentSignature = computeSignature(currentPosts);

          if (currentSignature !== lastSignature) {
            lastSignature = currentSignature;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'sync', posts: currentPosts })}\n\n`)
            );
          } else {
            // 心跳保持連線
            controller.enqueue(encoder.encode(`: ping\n\n`));
          }
        } catch {
          clearInterval(interval);
        }
      }, 3000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // 忽略
        }
      });
    },
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
