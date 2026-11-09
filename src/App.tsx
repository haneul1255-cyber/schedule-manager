import { useEffect, useState } from 'react';

interface Health {
  ok: boolean;
  tables: string[];
  foreignKeys: boolean;
}

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setHealth)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <main className="container">
      <h1>합주 시간 맞추기</h1>
      {error && <p className="error">API 연결 실패: {error}</p>}
      {!health && !error && <p>API 확인 중…</p>}
      {health && (
        <p>
          API 정상 · 외래키 {health.foreignKeys ? '활성' : '비활성'} · 테이블 {health.tables.length}개 (
          {health.tables.join(', ')})
        </p>
      )}
    </main>
  );
}
