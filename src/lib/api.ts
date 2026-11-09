// 서버 API 호출. 인증은 HttpOnly 쿠키로만 하므로 토큰을 직접 다루지 않는다.

export interface User {
  id: number;
  username: string;
  displayName: string;
}

export type RoomRole = 'owner' | 'member';

export interface RoomSummary {
  id: string;
  name: string;
  role: RoomRole;
  dayStart: number;
  dayEnd: number;
  memberCount: number;
  dateCount: number;
  firstDate: string | null;
  lastDate: string | null;
}

export interface RoomMember {
  id: number;
  displayName: string;
  role: RoomRole;
}

export interface Song {
  id: number;
  title: string;
  memberIds: number[];
}

export interface RoomData {
  room: {
    id: string;
    name: string;
    ownerId: number;
    inviteCode: string;
    dayStart: number;
    dayEnd: number;
    slotMinutes: number;
    createdAt: number;
  };
  dates: string[];
  members: RoomMember[];
  songs: Song[];
  /** availability[userId][date] = '0101...' */
  availability: Record<string, Record<string, string>>;
  me: { id: number; role: RoomRole };
}

export interface RoomInput {
  name: string;
  dates: string[];
  dayStart: number;
  dayEnd: number;
}

export interface SongLogMember {
  id: number;
  name: string;
}
export interface SongSnapshot {
  title: string;
  members: SongLogMember[];
}
export interface SongLog {
  id: number;
  songId: number | null;
  actorName: string;
  action: 'create' | 'update' | 'delete';
  detail: { before?: SongSnapshot; after?: SongSnapshot };
  /** unix 초 */
  createdAt: number;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** 세션 만료 등으로 401을 받았을 때 호출 (AuthProvider가 등록) */
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
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
    // 로그인 실패(401)는 정상 흐름이므로 제외. 그 밖의 401은 세션 만료 → 로그인 화면으로.
    if (res.status === 401 && !path.startsWith('/api/auth/')) unauthorizedHandler?.();
    if (data?.error) throw new ApiError(res.status, data.error);
    // JSON 에러 본문이 없는 502~504: API 서버가 꺼져 있거나 응답하지 않음
    // (로컬 개발에서는 `npm run dev:api`가 실행 중이 아닐 때 vite 프록시가 502를 돌려준다)
    if (res.status >= 502 && res.status <= 504) {
      throw new ApiError(res.status, 'API 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
    }
    throw new ApiError(res.status, `요청에 실패했습니다. (${res.status})`);
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

  listRooms: () => request<{ rooms: RoomSummary[] }>('GET', '/api/rooms'),
  createRoom: (input: RoomInput) => request<{ room: { id: string } }>('POST', '/api/rooms', input),
  joinRoom: (inviteCode: string) =>
    request<{ roomId: string; joined: boolean }>('POST', '/api/rooms/join', { inviteCode }),
  getRoom: (id: string) => request<RoomData>('GET', `/api/rooms/${encodeURIComponent(id)}`),
  updateRoom: (id: string, input: Partial<RoomInput>) =>
    request<RoomData>('PATCH', `/api/rooms/${encodeURIComponent(id)}`, input),
  deleteRoom: (id: string) => request<{ ok: true }>('DELETE', `/api/rooms/${encodeURIComponent(id)}`),
  leaveRoom: (id: string) => request<{ ok: true }>('POST', `/api/rooms/${encodeURIComponent(id)}/leave`),
  transferOwner: (id: string, userId: number) =>
    request<{ ok: true }>('POST', `/api/rooms/${encodeURIComponent(id)}/transfer`, { userId }),
  kickMember: (id: string, userId: number) =>
    request<{ ok: true }>('DELETE', `/api/rooms/${encodeURIComponent(id)}/members/${userId}`),
  saveAvailability: (id: string, availability: Record<string, string>) =>
    request<{ ok: true }>('PUT', `/api/rooms/${encodeURIComponent(id)}/availability`, availability),
  createSong: (roomId: string, title: string, memberIds: number[]) =>
    request<{ song: Song }>('POST', `/api/rooms/${encodeURIComponent(roomId)}/songs`, { title, memberIds }),
  updateSong: (songId: number, input: { title?: string; memberIds?: number[] }) =>
    request<{ song: Song }>('PATCH', `/api/songs/${songId}`, input),
  deleteSong: (songId: number) => request<{ ok: true }>('DELETE', `/api/songs/${songId}`),
  songLogs: (roomId: string) =>
    request<{ logs: SongLog[] }>('GET', `/api/rooms/${encodeURIComponent(roomId)}/song-logs`),
  regenerateInvite: (id: string) =>
    request<{ inviteCode: string }>('POST', `/api/rooms/${encodeURIComponent(id)}/invite-code`),
};
