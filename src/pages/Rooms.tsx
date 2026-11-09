import { useAuth } from '../lib/auth';

// 3단계에서 방 목록·방 만들기로 채운다.
export default function Rooms() {
  const { user } = useAuth();
  return (
    <section>
      <h1>내 방</h1>
      <p className="muted">{user?.displayName}님, 로그인되었습니다. 방 기능은 다음 단계에서 추가됩니다.</p>
    </section>
  );
}
