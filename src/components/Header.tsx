interface HeaderProps {
  branchName: string;
  passed: number;
  total: number;
}

export function Header({ branchName, passed, total }: HeaderProps) {
  const pct = total === 0 ? 0 : Math.round((passed / total) * 100);

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">⟳</span>
            <span className="logo-text">Ralph</span>
          </div>
          <div className="branch-pill">
            <span className="branch-icon">⎇</span>
            {branchName}
          </div>
        </div>
        <div className="header-right">
          <div className="progress-info">
            <span className="progress-label">{passed} / {total} stories</span>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="progress-pct">{pct}%</span>
          </div>
        </div>
      </div>
    </header>
  );
}
