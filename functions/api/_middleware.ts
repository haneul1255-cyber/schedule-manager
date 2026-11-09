import { errorResponse, HttpError } from '../_lib/http';
import { getSessionUser } from '../_lib/session';
import type { Handler } from '../_lib/types';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * 모든 /api 요청 공통 처리:
 * 1) 상태 변경 요청은 Origin이 같은 사이트인지 확인 (SameSite=Lax 쿠키에 더한 CSRF 방어)
 * 2) 세션 쿠키로 로그인 사용자 확인 → context.data.user
 * 3) 예외를 `{ error }` 형식으로 변환
 */
export const onRequest: Handler = async (ctx) => {
  try {
    const { request } = ctx;
    if (!SAFE_METHODS.has(request.method)) {
      const origin = request.headers.get('Origin');
      if (origin && origin !== new URL(request.url).origin) {
        return errorResponse(403, '허용되지 않은 요청 출처입니다.');
      }
    }
    ctx.data.user = await getSessionUser(ctx.env.DB, request);
    return await ctx.next();
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.message);
    // 요청 본문(비밀번호 포함 가능)은 로그에 남기지 않는다.
    console.error('Unhandled error:', err instanceof Error ? err.message : String(err));
    return errorResponse(500, '서버 오류가 발생했습니다.');
  }
};
