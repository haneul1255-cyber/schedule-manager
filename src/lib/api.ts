// 서버 API 호출. 인증은 HttpOnly 쿠키로만 하므로 토큰을 직접 다루지 않는다.

export interface User {
  id: number;
  username: string;
  displayName: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, '서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.');
  }
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? `요청에 실패했습니다. (${res.status})`);
  }
  return data as T;
}

export const api = {
  signup: (username: string, password: string, displayName: string) =>
    request<{ user: User }>('POST', '/api/auth/signup', { username, password, displayName }),
  login: (username: string, password: string) =>
    request<{ user: User }>('POST', '/api/auth/login', { username, password }),
  logout: () => request<{ ok: true }>('POST', '/api/auth/logout'),
  me: () => request<{ user: User | null }>('GET', '/api/auth/me'),
};
