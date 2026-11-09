import type { Data, SessionUser } from './types';

/** 핸들러 어디서든 throw하면 미들웨어가 `{ error }` 응답으로 바꾼다. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function errorResponse(status: number, message: string): Response {
  return json({ error: message }, { status });
}

/** JSON 본문을 객체로 읽는다. 형식이 틀리면 400. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get('Content-Type') ?? '';
  if (!type.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'Content-Type은 application/json이어야 합니다.');
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, '잘못된 JSON 형식입니다.');
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new HttpError(400, '요청 본문은 JSON 객체여야 합니다.');
  }
  return body as Record<string, unknown>;
}

export function requireUser(data: Data): SessionUser {
  if (!data.user) throw new HttpError(401, '로그인이 필요합니다.');
  return data.user;
}
