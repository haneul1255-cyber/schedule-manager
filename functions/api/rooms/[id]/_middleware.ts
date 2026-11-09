import { requireRoomMember } from '../../../_lib/access';
import { requireUser } from '../../../_lib/http';
import type { Handler } from '../../../_lib/types';

/**
 * Pages Functions의 미들웨어는 경로 패턴으로 적용되므로 `/api/rooms/join`도
 * `/api/rooms/:id` 패턴에 걸린다. 그 정확한 경로만 제외한다.
 * (핸들러는 방 ID를 params가 아니라 data.room에서 꺼내므로, 검사를 거치지 않은
 *  요청이 방 데이터에 접근할 수는 없다.)
 */
const NON_ROOM_PATHS = new Set(['/api/rooms/join']);

/**
 * /api/rooms/:id/** 의 모든 요청은 여기서 방 멤버인지 확인한다.
 * 이 폴더에 새 라우트를 추가하면 자동으로 적용되므로 개별 핸들러에서 빠뜨릴 수 없다.
 */
export const onRequest: Handler<'id'> = async (ctx) => {
  if (NON_ROOM_PATHS.has(new URL(ctx.request.url).pathname)) return ctx.next();
  const user = requireUser(ctx.data);
  ctx.data.room = await requireRoomMember(ctx.env.DB, String(ctx.params.id), user.id);
  return ctx.next();
};
