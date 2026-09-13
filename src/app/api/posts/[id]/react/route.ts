import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const body = await request.json();
    const { type = 'like', value } = body;

    const post = db.getPostById(id);
    if (!post) {
      return NextResponse.json({ error: '找不到貼文' }, { status: 404 });
    }

    if (post.status === 'pending') {
      return NextResponse.json(
        { error: '此便籤尚在等待老師審核中，審核通過後方可進行互動' },
        { status: 403 }
      );
    }

    // 訪客若無登入，使用隨機/IP識別
    const userId = user?.id || body.guestId || 'guest-user';

    const updatedPost = db.toggleReaction(id, userId, type, value);
    if (!updatedPost) {
      return NextResponse.json({ error: '找不到貼文' }, { status: 404 });
    }

    return NextResponse.json({ success: true, post: updatedPost });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '操作失敗';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
