import { getCurrentUserId } from '@/lib/auth';
import db from '@/lib/db';

export const maxDuration = 60;

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const otherId = url.searchParams.get('otherId');

  const encoder = new TextEncoder();
  let lastNotifTime = '';
  let lastMsgTime = '';

  const stream = new ReadableStream({
    async start(controller) {
      const interval = setInterval(async () => {
        try {
          if (type === 'messages' && otherId) {
            const newMessages = (await db.execute({ sql: `
              SELECT * FROM messages
              WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
              AND created_at > ?
              ORDER BY created_at ASC
            `, args: [userId, otherId, otherId, userId, lastMsgTime || '1970-01-01'] })).rows;

            if (newMessages.length > 0) {
              lastMsgTime = (newMessages[newMessages.length - 1] as any).created_at;
              controller.enqueue(encoder.encode(`event: messages\ndata: ${JSON.stringify(newMessages)}\n\n`));
            }
          } else if (type === 'community') {
            const communityId = url.searchParams.get('community_id');
            if (communityId) {
              const newCommunity = (await db.execute({ sql: `
                SELECT cm.*, u.username, u.display_name, u.avatar
                FROM community_messages cm
                JOIN users u ON u.id = cm.user_id
                WHERE cm.community_id = ? AND cm.created_at > ?
                ORDER BY cm.created_at ASC
              `, args: [communityId, lastMsgTime || '1970-01-01'] })).rows;

              if (newCommunity.length > 0) {
                lastMsgTime = (newCommunity[newCommunity.length - 1] as any).created_at;
                controller.enqueue(encoder.encode(`event: community\ndata: ${JSON.stringify(newCommunity)}\n\n`));
              }
            }
          } else if (type === 'unread') {
            const count = (await db.execute({ sql: 'SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read = 0', args: [userId] })).rows[0] as any;
            controller.enqueue(encoder.encode(`event: unread\ndata: ${JSON.stringify({ unread_count: count.c })}\n\n`));
          } else if (type === 'notifications') {
            const newNotifs = (await db.execute({ sql: `
              SELECT n.*, u.username as actor_username, u.display_name as actor_display_name, u.avatar as actor_avatar
              FROM notifications n
              JOIN users u ON u.id = n.actor_id
              WHERE n.user_id = ? AND n.created_at > ?
              ORDER BY n.created_at DESC
            `, args: [userId, lastNotifTime || '1970-01-01'] })).rows;

            if (newNotifs.length > 0) {
              lastNotifTime = (newNotifs[0] as any).created_at;
              const unread = (await db.execute({ sql: 'SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read = 0', args: [userId] })).rows[0] as any;
              controller.enqueue(encoder.encode(`event: notifications\ndata: ${JSON.stringify({ notifications: newNotifs, unread_count: unread.c })}\n\n`));
            }
          }
        } catch {}
      }, 1500);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
