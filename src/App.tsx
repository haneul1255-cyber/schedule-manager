import type { ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Join from './pages/Join';
import Login from './pages/Login';
import Room from './pages/Room';
import Rooms from './pages/Rooms';
import Signup from './pages/Signup';

/** 로그인이 필요한 화면. 안 되어 있으면 현재 경로를 next로 넘겨 로그인 화면으로 보낸다. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    const next = location.pathname + location.search;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return <>{children}</>;
}

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="app-header">
      <Link to="/" className="brand">
        합주 시간 맞추기
      </Link>
      {user && (
        <div className="header-user">
          <span className="muted">{user.displayName}</span>
          <button
            className="btn small"
            onClick={async () => {
              await logout().catch(() => undefined);
              navigate('/login');
            }}
          >
            로그아웃
          </button>
        </div>
      )}
    </header>
  );
}

export default function App() {
  const { loading, error } = useAuth();

  if (loading) return <p className="container muted">불러오는 중…</p>;
  if (error) {
    return (
      <div className="container">
        <p className="error">{error}</p>
        <button className="btn" onClick={() => location.reload()}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Rooms />
              </RequireAuth>
            }
          />
          <Route
            path="/join/:code"
            element={
              <RequireAuth>
                <Join />
              </RequireAuth>
            }
          />
          <Route
            path="/rooms/:id"
            element={
              <RequireAuth>
                <Room />
              </RequireAuth>
            }
          />
          <Route path="*" element={<p>페이지를 찾을 수 없습니다. <Link to="/">처음으로</Link></p>} />
        </Routes>
      </main>
    </>
  );
}
