import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** 예상하지 못한 렌더링 오류가 나도 빈 화면 대신 안내를 보여준다. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="container">
        <section className="panel">
          <h1>문제가 발생했습니다</h1>
          <p className="muted">화면을 표시하는 중 오류가 났습니다. 새로고침해 주세요.</p>
          <div className="toolbar" style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={() => window.location.reload()}>
              새로고침
            </button>
            <a className="btn" href="/">
              처음으로
            </a>
          </div>
        </section>
      </main>
    );
  }
}
