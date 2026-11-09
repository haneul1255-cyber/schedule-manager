export interface Env {
  DB: D1Database;
}

export interface SessionUser {
  id: number;
  username: string;
  displayName: string;
}

/** 미들웨어가 채워 넣는 요청별 데이터 */
export interface Data extends Record<string, unknown> {
  user: SessionUser | null;
}

export type Handler<P extends string = string> = PagesFunction<Env, P, Data>;
