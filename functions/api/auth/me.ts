import { json } from '../../_lib/http';
import type { Handler } from '../../_lib/types';

/** 로그인 안 된 상태는 에러가 아니라 `{ user: null }`로 응답한다. */
export const onRequestGet: Handler = async ({ data }) => json({ user: data.user });
