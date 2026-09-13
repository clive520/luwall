import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  await db.ensureHydrated();
  const board = await db.getBoardByIdAsync(id);

  const isAdmin = user?.role === 'admin';
  const isBoardOwner = Boolean(user && board && user.id === board.createdBy);
  const canReview = isBoardOwner || isAdmin;

  const guestPostsParam = request.nextUrl.searchParams.get('guestPosts');
  const guestPostIds = guestPostsParam ? guestPostsParam.split(',').filter(Boolean) : [];

  const getVisiblePosts = () => db.getPostsByBoardId(id, canReview, user?.id, guestPostIds);

  const encoder = new TextEncoder();

  const customReadable = new ReadableStream({
    async start(controller) {
      await db.ensureHydrated();
      // 首次發送目前使用者可見的所有貼文（包含學生的待審核貼文）
      const initialPosts = getVisiblePosts();
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
          const currentPosts = getVisiblePosts();
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
