interface HeaderProps {
  branchName: string;
  passed: number;
  total: number;
  isRunning: boolean;
  allDone: boolean;
  onPlay: () => void;
  onStop: () => void;
  onReset: () => void;
  tab: string;
  onTabChange: (tab: string) => void;
  hideControls?: boolean;
}

export function Header({
  branchName, passed, total, isRunning, allDone,
  onPlay, onStop, onReset, tab, onTabChange, hideControls
}: HeaderProps) {
  const pct = total === 0 ? 0 : Math.round((passed / total) * 100);

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-left">
          <div className="logo">
            <span className={`logo-icon ${isRunning ? 'spinning' : ''}`}>⟳</span>
            <span className="logo-text">Ralph</span>
          </div>
          <div className="branch-pill">
            <span className="branch-icon">⎇</span>
            {branchName}
          </div>
        </div>

        <div className="header-tabs">
          <button
            className={`tab-btn ${tab === 'demo' ? 'tab-active' : ''}`}
            onClick={() => onTabChange('demo')}
          >
            Demo
          </button>
          <button
            className={`tab-btn ${tab === 'api' ? 'tab-active' : ''}`}
            onClick={() => onTabChange('api')}
          >
            API
          </button>
        </div>

        <div className="header-right-group">
          {!hideControls && (
            <div className="header-center">
              <div className="controls">
                {isRunning ? (
                  <button className="ctrl-btn ctrl-stop" onClick={onStop} title="Stop agent loop">
                    <span className="ctrl-icon">■</span>
                    Stop
                  </button>
                ) : (
                  <button
                    className="ctrl-btn ctrl-play"
                    onClick={onPlay}
                    disabled={allDone}
                    title="Run agent loop"
                  >
                    <span className="ctrl-icon">▶</span>
                    {allDone ? 'Done' : 'Run'}
                  </button>
                )}
                <button className="ctrl-btn ctrl-reset" onClick={onReset} title="Reset all stories">
                  <span className="ctrl-icon">↺</span>
                  Reset
                </button>
              </div>

              {isRunning && (
                <div className="running-indicator">
                  <span className="pulse-dot" />
                  <span className="running-label">Agent running...</span>
                </div>
              )}
            </div>
          )}

          {!hideControls && (
            <div className="header-right">
              <div className="progress-info">
                <span className="progress-label">{passed} / {total} stories</span>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="progress-pct">{pct}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
