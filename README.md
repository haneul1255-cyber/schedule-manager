# 합주 시간 맞추기

밴드 합주 시간을 맞추는 when2meet 스타일 웹앱입니다. 지인 10~20명이 쓰는 소규모 서비스로,
Cloudflare 무료 플랜(Pages + Pages Functions + D1)만으로 운영합니다.

## 기능

- 아이디/비밀번호 회원가입·로그인 (이메일 없음)
- 방 만들기: 날짜 여러 개 선택, 하루 시작·끝 시간, 30분 단위 슬롯
- 초대 링크(`/join/:code`)로 참가 — 로그인 전이면 로그인 후 자동 참가
- 내 가능 시간을 드래그로 칠하기 (방 단위로 한 번만 입력, 자동 저장)
- 곡 추가와 곡별 참여 멤버 지정 (방 멤버 누구나), 곡 변경 기록은 방장만 열람
- 결과 히트맵: 전체합주 또는 곡 여러 개 선택(선택한 곡 멤버의 합집합 기준),
  호버/탭 툴팁, 전원 가능 구간 목록, 선택한 곡은 URL(`?songs=3,5`)로 공유
- 방장: 방 설정 수정, 방장 넘기기, 멤버 내보내기, 초대 링크 재발급, 방 삭제
- 시간대는 Asia/Seoul 고정

## 기술 스택

| 영역 | 사용 |
|---|---|
| 프론트엔드 | React + TypeScript + Vite (UI 라이브러리 없이 CSS 직접 작성) |
| 백엔드 | Cloudflare Pages Functions (`functions/`) |
| DB | Cloudflare D1 (SQLite), 마이그레이션은 `migrations/` |
| 테스트 | Vitest |

```
src/
  pages/        Login, Signup, Rooms, Join, Room
  components/   AvailabilityGrid, HeatmapGrid, ScopeSelector, SongManager, CreateRoomForm …
  lib/          api.ts, slots.ts(결과 계산 순수 함수), dates.ts, scope.ts …
functions/
  _lib/         crypto.ts, session.ts, db.ts, validate.ts, access.ts …
  api/          auth/, rooms/, songs/  (+ _middleware.ts: 세션·에러 처리, 방 멤버 확인)
migrations/     0001_init.sql, 0002_song_logs.sql
scripts/        reset-password.mjs (비밀번호 초기화 SQL 생성)
```

---

## 로컬 실행

필요: Node.js 22 이상 (Cloudflare 계정은 로컬 실행에 필요 없음)

```bash
npm install
npm run db:migrate:local    # 로컬 D1에 테이블 생성 (.wrangler/state 폴더에 저장)
```

터미널 두 개에서 각각 실행합니다.

```bash
npm run dev:api   # 터미널 1: API 서버 (wrangler, http://localhost:8788)
                  #           시작할 때 아직 적용 안 된 로컬 마이그레이션을 자동 적용
npm run dev       # 터미널 2: 화면 (vite, http://localhost:5173)
```

브라우저에서 **http://localhost:5173** 으로 접속합니다. `/api` 요청은 vite가 wrangler로 넘깁니다.

### 테스트

```bash
npm test          # Vitest (slots.ts 계산 함수, 해싱·세션, 입력 검증, 비밀번호 초기화 스크립트)
npm run build     # 타입 검사 + 프로덕션 빌드
```

### 휴대폰으로 테스트 (같은 Wi-Fi)

```bash
npm run dev:api   # 터미널 1: 그대로
npm run dev:lan   # 터미널 2: vite를 네트워크에 공개 (vite --host)
```

출력되는 `Network: http://192.168.x.x:5173` 주소를 휴대폰 브라우저에서 엽니다.
macOS가 node의 수신 연결 허용을 물으면 허용하세요. 회사·학교 Wi-Fi처럼 기기 간 통신을 막는 네트워크에서는
휴대폰 핫스팟에 Mac을 연결하면 됩니다.

### 자주 만나는 문제

| 증상 | 원인 / 해결 |
|---|---|
| "API 서버에 연결할 수 없습니다" (502) | 터미널 1의 `npm run dev:api`가 꺼져 있음 → 다시 실행 |
| `no such table: …` (500) | 마이그레이션 미적용 → `npm run db:migrate:local` 후 `dev:api` 재시작 |
| 로컬 DB를 처음부터 다시 | `dev:api`를 끄고 `.wrangler/state` 폴더 삭제 → `npm run db:migrate:local` (모든 로컬 데이터 삭제) |

---

## Cloudflare 배포

아래 명령은 모두 이 프로젝트 폴더에서 직접 실행합니다. 무료 플랜으로 충분합니다.

### 1. Cloudflare 로그인

```bash
npx wrangler login
```

브라우저가 열리면 Cloudflare 계정으로 로그인하고 권한을 허용합니다.

### 2. D1 데이터베이스 생성

```bash
npx wrangler d1 create band-schedule-db
```

출력에 나오는 `database_id` 값을 `wrangler.toml`에 넣습니다.

```toml
[[d1_databases]]
binding = "DB"
database_name = "band-schedule-db"
database_id = "여기에-출력된-ID"       # 00000000-… 자리 교체
migrations_dir = "migrations"
```

### 3. 원격 DB에 마이그레이션 적용

```bash
npm run db:migrate:remote
```

확인 질문에 `y`를 입력합니다. 확인:

```bash
npx wrangler d1 execute band-schedule-db --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
```

### 4. GitHub에 올리기

GitHub에서 새 저장소(Private 권장)를 만든 뒤:

```bash
git add wrangler.toml
git commit -m "D1 database_id 설정"
git remote add origin https://github.com/<내 계정>/<저장소>.git
git push -u origin main
```

### 5. Cloudflare Pages 프로젝트 만들기 (GitHub 연결)

1. [Cloudflare 대시보드](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** 탭 → **Connect to Git**
2. GitHub 계정을 연결하고 위 저장소 선택 → **Begin setup**
3. 빌드 설정
   - Project name: 원하는 이름 (주소가 `https://<이름>.pages.dev`가 됨)
   - Production branch: `main`
   - Framework preset: `None`
   - Build command: `npm run build`
   - Build output directory: `dist`
4. **Save and Deploy** → 빌드가 끝나면 `https://<이름>.pages.dev`로 접속

Node 버전은 저장소의 `.node-version`(22)을 Cloudflare가 자동으로 사용합니다.

### 6. D1 바인딩 확인

이 프로젝트는 `wrangler.toml`에 `pages_build_output_dir`와 D1 바인딩(`DB`)이 들어 있어서,
**배포할 때 바인딩이 자동으로 적용됩니다.** 확인 방법:

1. 대시보드 → Workers & Pages → 프로젝트 → **Settings** → **Bindings**
2. `DB` → `band-schedule-db` (D1 database) 가 보이면 정상

만약 보이지 않거나 `wrangler.toml` 없이 대시보드에서 직접 관리하고 싶다면:

1. 같은 화면에서 **Add** → **D1 database**
2. Variable name: `DB` (정확히 대문자 DB), D1 database: `band-schedule-db` → Save
3. **Deployments** 탭 → 최신 배포의 메뉴(⋯) → **Retry deployment** (바인딩은 다음 배포부터 적용)

배포 후 사이트에서 회원가입이 되면 Functions와 D1이 모두 정상입니다.
문제가 있으면 프로젝트 → **Deployments** → 해당 배포 → **Functions** 로그(Real-time logs)를 확인하세요.

### 이후 업데이트

- 코드 변경: `git push` 하면 자동으로 다시 배포됩니다.
- **새 마이그레이션이 추가된 경우**: 코드를 push하기 **전에** `npm run db:migrate:remote`를 먼저 실행합니다.
  (새 코드가 아직 없는 테이블을 쓰면 오류가 납니다.)

### 비용

Pages Functions 요청은 Workers 무료 한도(일 10만 건), D1은 무료 한도(일 500만 행 읽기, 10만 행 쓰기, 5GB) 안에서
동작합니다. 20명이 방 화면을 열어 두면 30초마다 조회하지만, 탭이 보이지 않을 때는 조회를 멈추므로 한도에 크게 못 미칩니다.

---

## 비밀번호 초기화 (관리자)

비밀번호는 PBKDF2 해시로 저장되므로 SQL만으로는 새 비밀번호를 만들 수 없습니다.
로컬에서 스크립트로 해시를 만든 뒤 D1 콘솔에서 실행합니다.

### 1. SQL 만들기 (내 컴퓨터에서)

```bash
node scripts/reset-password.mjs <아이디>
```

새 비밀번호를 두 번 입력합니다(화면에 표시되지 않고, 셸 기록에도 남지 않습니다). 출력 예:

```sql
UPDATE users SET password_hash = '9cdc…', salt = '0d55…' WHERE username = 'haneul';
DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = 'haneul');
```

두 번째 줄은 그 사용자의 기존 로그인을 모든 기기에서 끊습니다.

### 2. 실행 (둘 중 하나)

- **대시보드 D1 콘솔**: Cloudflare 대시보드 → **Storage & Databases** → **D1 SQL Database** → `band-schedule-db` →
  **Console** 탭에 위 SQL을 붙여 넣고 Execute
- **터미널**:
  ```bash
  npx wrangler d1 execute band-schedule-db --remote --command "<위에서 출력된 SQL>"
  ```
  (로컬 DB에 적용하려면 `--remote` 대신 `--local`)

### 3. 확인

```sql
SELECT id, username, display_name FROM users WHERE username = 'haneul';
```

새 비밀번호는 본인에게 안전한 경로로 전달하고, 로그인 후 바꾸도록 안내하세요.
(현재 앱에는 비밀번호 변경 화면이 없으므로, 필요하면 같은 방법으로 다시 초기화합니다.)

---

## 보안 메모

- 비밀번호: Web Crypto PBKDF2-SHA256 100,000회(Workers 상한), 16바이트 랜덤 salt, 32바이트 출력, 상수 시간 비교.
  원본 비밀번호는 DB·로그 어디에도 저장하지 않음
- 세션: 32바이트 랜덤 토큰을 `HttpOnly; Secure; SameSite=Lax; Path=/` 쿠키로 발급, DB에는 SHA-256 해시만 저장, 30일 만료.
  로컬 개발(localhost·사설 IP의 http)에서만 `Secure` 생략. 토큰은 localStorage에 저장하지 않음
- 로그인 실패는 아이디 유무와 관계없이 같은 메시지·같은 처리 시간
- `/api/rooms/:id/**`, `/api/songs/:songId/**` 전체에 방 멤버 확인 미들웨어(아니면 403), 방장 전용 작업은 별도 확인
- 상태를 바꾸는 요청은 다른 출처(Origin)면 거부, JSON 본문만 허용
- 방 ID·초대 코드는 96비트 랜덤 값
