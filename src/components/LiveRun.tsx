import { useState, useEffect, useRef } from 'react';
import { getRun, updateStory, updateRunStatus } from '../api';
import { StoryCard } from './StoryCard';
import type { UserStory, RunConfig } from '../types';

interface LiveRunProps {
  runId: string;
  apiKey: string;
  onClear: () => void;
}

interface RunData {
  id: string;
  branch_name: string;
  status: string;
  config: RunConfig;
  stories: UserStory[];
}

const TICK_MS = 2200;

export function LiveRun({ runId, apiKey, onClear }: LiveRunProps) {
  const [run, setRun] = useState<RunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRun = async () => {
    try {
      const data = await getRun(runId, apiKey);
      setRun(data);
      if (data.status === 'complete') setIsRunning(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRun(); }, []);

  const passed = run?.stories.filter(s => s.passes).length ?? 0;
  const total = run?.stories.length ?? 0;
  const allDone = passed === total && total > 0;
  const nextStory = run?.stories.find(s => !s.passes);
  const pct = total === 0 ? 0 : Math.round((passed / total) * 100);

  const handlePlay = async () => {
    await updateRunStatus(runId, apiKey, 'running');
    setIsRunning(true);
  };

  const handleStop = async () => {
    await updateRunStatus(runId, apiKey, 'paused');
    setIsRunning(false);
  };

  const handleReset = async () => {
    if (!run) return;
    setIsRunning(false);
    for (const s of run.stories) {
      if (s.passes) await updateStory(runId, apiKey, s.id, { passes: false });
    }
    await updateRunStatus(runId, apiKey, 'pending');
    await fetchRun();
  };

  const handleToggle = async (id: string) => {
    if (!run) return;
    const story = run.stories.find(s => s.id === id);
    if (!story) return;
    await updateStory(runId, apiKey, id, { passes: !story.passes });
    await fetchRun();
  };

  useEffect(() => {
    if (isRunning && !allDone) {
      intervalRef.current = setInterval(async () => {
        if (!run) return;
        const next = run.stories.find(s => !s.passes);
        if (!next) { setIsRunning(false); return; }
        await updateStory(runId, apiKey, next.id, { passes: true });
        await fetchRun();
      }, TICK_MS);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, allDone, run]);

  if (loading) {
    return (
      <div className="live-run-loading">
        <span className="pulse-dot" />
        <span>Loading run...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="live-run-error">
        <span>Error: {error}</span>
        <button className="ctrl-btn ctrl-reset" onClick={onClear}>Back</button>
      </div>
    );
  }

  if (!run) return null;

  const cfg = run.config;

  return (
    <div className="live-run">
      <div className="live-run-header">
        <div className="live-run-meta">
          <div className="branch-pill">
            <span className="branch-icon">⎇</span>
            {run.branch_name}
          </div>
          <span className="run-id-label">Run: <code>{runId.slice(0, 8)}...</code></span>
          <span className="api-key-label">Key: <code>{apiKey.slice(0, 8)}...</code></span>
          <button className="config-toggle-btn" onClick={() => setShowConfig(v => !v)}>
            {showConfig ? 'Hide config' : 'Show config'}
          </button>
        </div>

        {showConfig && cfg && (
          <div className="run-config-panel">
            <div className="config-row">
              <span className="config-label">Model</span>
              <span className="config-value config-value--badge">{cfg.model}</span>
            </div>
            <div className="config-row">
              <span className="config-label">Pattern</span>
              <span className="config-value config-value--badge">
                {cfg.generation_pattern === 'edit_existing' ? 'Edit existing' : 'Generate new'}
              </span>
            </div>
            {cfg.goal && (
              <div className="config-row config-row--block">
                <span className="config-label">Goal</span>
                <p className="config-value config-value--text">{cfg.goal}</p>
              </div>
            )}
            {cfg.system_prompt && (
              <div className="config-row config-row--block">
                <span className="config-label">Prompt</span>
                <pre className="config-value config-value--pre">{cfg.system_prompt}</pre>
              </div>
            )}
            {cfg.story_order?.length > 0 && (
              <div className="config-row config-row--block">
                <span className="config-label">Order</span>
                <span className="config-value config-value--text">{cfg.story_order.join(' → ')}</span>
              </div>
            )}
          </div>
        )}

        <div className="live-run-controls">
          <div className="controls">
            {isRunning ? (
              <button className="ctrl-btn ctrl-stop" onClick={handleStop}>
                <span className="ctrl-icon">■</span> Stop
              </button>
            ) : (
              <button className="ctrl-btn ctrl-play" onClick={handlePlay} disabled={allDone}>
                <span className="ctrl-icon">▶</span> {allDone ? 'Done' : 'Run'}
              </button>
            )}
            <button className="ctrl-btn ctrl-reset" onClick={handleReset}>
              <span className="ctrl-icon">↺</span> Reset
            </button>
            <button className="ctrl-btn ctrl-reset" onClick={onClear}>
              ← Back
            </button>
          </div>

          <div className="progress-info">
            <span className="progress-label">{passed} / {total}</span>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="progress-pct">{pct}%</span>
          </div>
        </div>
      </div>

      {allDone && (
        <div className="complete-banner">
          <span className="complete-icon">✓</span>
          All stories complete — agent loop done!
        </div>
      )}

      <div className="stories-grid">
        {run.stories.map(story => (
          <StoryCard
            key={story.id}
            story={story}
            isNext={!allDone && story.id === nextStory?.id}
            isRunning={isRunning}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}
