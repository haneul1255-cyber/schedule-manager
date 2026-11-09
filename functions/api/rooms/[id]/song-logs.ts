import { requireOwner } from '../../../_lib/access';
import { json } from '../../../_lib/http';
import type { Handler } from '../../../_lib/types';

/** 곡 변경 기록 (방장만). 최근 200건. */
export const onRequestGet: Handler<'id'> = async ({ env, data }) => {
  const { roomId } = requireOwner(data);
  const { results } = await env.DB.prepare(
    `SELECT id, song_id, actor_name, action, detail, created_at FROM song_logs
      WHERE room_id = ? ORDER BY id DESC LIMIT 200`,
  )
    .bind(roomId)
    .all<{ id: number; song_id: number | null; actor_name: string; action: string; detail: string; created_at: number }>();
  return json({
    logs: results.map((r) => ({
      id: r.id,
      songId: r.song_id,
      actorName: r.actor_name,
      action: r.action,
      detail: JSON.parse(r.detail),
      createdAt: r.created_at,
    })),
  });
};
