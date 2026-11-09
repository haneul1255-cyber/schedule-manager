import { HttpError } from './http';
import type { Data, RoomAccess, RoomRole } from './types';

const NO_ACCESS = '방이 없거나 접근 권한이 없습니다.';

/**
 * 요청자가 방 멤버인지 확인. 방이 없을 때도 같은 403을 돌려
 * 방 존재 여부가 드러나지 않게 한다.
 */
export async function requireRoomMember(db: D1Database, roomId: string, userId: number): Promise<RoomAccess> {
  const row = await db
    .prepare('SELECT role FROM room_members WHERE room_id = ? AND user_id = ?')
    .bind(roomId, userId)
    .first<{ role: RoomRole }>();
  if (!row) throw new HttpError(403, NO_ACCESS);
  return { roomId, role: row.role };
}

/** 방 멤버 미들웨어를 거친 핸들러에서 사용 */
export function roomAccess(data: Data): RoomAccess {
  if (!data.room) throw new Error('room middleware missing'); // 라우팅 구성 오류
  return data.room;
}

export function requireOwner(data: Data): RoomAccess {
  const room = roomAccess(data);
  if (room.role !== 'owner') throw new HttpError(403, '방장만 할 수 있는 작업입니다.');
  return room;
}
