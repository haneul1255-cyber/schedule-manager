export interface Env {
  DB: D1Database;
}

export interface SessionUser {
  id: number;
  username: string;
  displayName: string;
}

export type RoomRole = 'owner' | 'member';

export interface RoomAccess {
  roomId: string;
  role: RoomRole;
}

/** 미들웨어가 채워 넣는 요청별 데이터 */
export interface Data extends Record<string, unknown> {
  user: SessionUser | null;
  /** 방 멤버 확인 미들웨어를 거친 요청에서만 존재 */
  room?: RoomAccess;
  /** 곡 미들웨어를 거친 요청에서만 존재 */
  songId?: number;
}

export type Handler<P extends string = string> = PagesFunction<Env, P, Data>;
