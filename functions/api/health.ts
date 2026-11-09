import type { Env } from '../_lib/types';

// 1단계 확인용: D1 바인딩과 마이그레이션 적용 여부를 보여준다.
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name != 'd1_migrations' ORDER BY name",
  ).all<{ name: string }>();
  const fk = await env.DB.prepare('PRAGMA foreign_keys').first<{ foreign_keys: number }>();
  return Response.json({
    ok: true,
    tables: results.map((r) => r.name),
    foreignKeys: fk?.foreign_keys === 1,
  });
};
