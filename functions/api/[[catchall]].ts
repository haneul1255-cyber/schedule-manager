import { errorResponse } from '../_lib/http';
import type { Handler } from '../_lib/types';

// 정의되지 않은 /api 경로는 SPA index.html 대신 JSON 404를 돌려준다.
export const onRequest: Handler = async () => errorResponse(404, '존재하지 않는 API입니다.');
