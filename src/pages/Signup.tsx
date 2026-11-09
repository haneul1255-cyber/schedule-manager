import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { safeNext } from '../lib/redirect';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export default function Signup() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const normalized = username.trim().toLowerCase();
    if (!USERNAME_RE.test(normalized)) {
      setError('아이디는 영문 소문자·숫자·밑줄(_) 3~20자여야 합니다.');
      return;
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (password !== password2) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await api.signup(normalized, password, displayName);
      setUser(r.user);
      navigate(next, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const loginLink = params.get('next') ? `/login?next=${encodeURIComponent(next)}` : '/login';

  return (
    <div className="auth-card">
      <h1>회원가입</h1>
      <form onSubmit={onSubmit} className="form">
        <label>
          아이디
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={20}
            required
          />
          <span className="hint">영문 소문자·숫자·밑줄 3~20자</span>
        </label>
        <label>
          표시 이름
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="nickname"
            maxLength={20}
            required
          />
          <span className="hint">방에서 다른 사람에게 보이는 이름 (1~20자)</span>
        </label>
        <label>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <span className="hint">8자 이상</span>
        </label>
        <label>
          비밀번호 확인
          <input
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? '가입 중…' : '가입하기'}
        </button>
      </form>
      <p className="muted">
        이미 계정이 있나요? <Link to={loginLink}>로그인</Link>
      </p>
    </div>
  );
}
