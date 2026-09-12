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
      // 首次發送目前所有 approved 貼文
      const initialPosts = db.getPostsByBoardId(id, false);
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'sync', posts: initialPosts })}\n\n`)
      );

      // 設定定時心跳與資料檢查
      let lastCount = initialPosts.length;
      const interval = setInterval(() => {
        try {
          const currentPosts = db.getPostsByBoardId(id, false);
          if (currentPosts.length !== lastCount) {
            lastCount = currentPosts.length;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'sync', posts: currentPosts })}\n\n`)
            );
          } else {
            // 心跳保持
            controller.enqueue(encoder.encode(`: ping\n\n`));
          }
        } catch {
          clearInterval(interval);
        }
      }, 3000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
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
