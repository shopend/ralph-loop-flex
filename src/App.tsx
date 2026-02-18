import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { StoryCard } from './components/StoryCard';
import { ApiDocs } from './components/ApiDocs';
import { LiveRun } from './components/LiveRun';
import { prdData } from './data';
import { createRun } from './api';
import type { UserStory } from './types';
import './App.css';

const TICK_MS = 2200;
type Tab = 'demo' | 'api';

export default function App() {
  const [tab, setTab] = useState<Tab>('demo');
  const [stories, setStories] = useState<UserStory[]>(prdData.userStories);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [liveRunId, setLiveRunId] = useState('');
  const [liveApiKey, setLiveApiKey] = useState('');
  const [creating, setCreating] = useState(false);

  const passed = stories.filter(s => s.passes).length;
  const nextStory = stories.find(s => !s.passes);
  const allDone = passed === stories.length;

  const handleToggle = (id: string) => {
    setStories(prev => prev.map(s => s.id === id ? { ...s, passes: !s.passes } : s));
  };

  const handlePlay = () => { if (!allDone) setIsRunning(true); };
  const handleStop = () => setIsRunning(false);
  const handleReset = () => {
    setIsRunning(false);
    setStories(prdData.userStories.map(s => ({ ...s, passes: false })));
  };

  useEffect(() => {
    if (isRunning && !allDone) {
      intervalRef.current = setInterval(() => {
        setStories(prev => {
          const idx = prev.findIndex(s => !s.passes);
          if (idx === -1) return prev;
          return prev.map((s, i) => i === idx ? { ...s, passes: true } : s);
        });
      }, TICK_MS);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (allDone) setIsRunning(false);
    }
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [isRunning, allDone]);

  const handleCreateDemo = async () => {
    setCreating(true);
    try {
      const result = await createRun(prdData);
      setLiveRunId(result.run_id);
      setLiveApiKey(result.api_key);
      setTab('api');
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const showLiveRun = tab === 'api' && liveRunId;

  return (
    <div className="app">
      <Header
        branchName={prdData.branchName}
        passed={tab === 'demo' ? passed : 0}
        total={tab === 'demo' ? stories.length : 0}
        isRunning={tab === 'demo' ? isRunning : false}
        allDone={tab === 'demo' ? allDone : false}
        onPlay={handlePlay}
        onStop={handleStop}
        onReset={handleReset}
        tab={tab}
        onTabChange={(t) => setTab(t as Tab)}
        hideControls={tab === 'api'}
      />

      <main className="main">
        {tab === 'demo' && (
          <>
            {allDone && (
              <div className="complete-banner">
                <span className="complete-icon">✓</span>
                All stories complete — agent loop done!
              </div>
            )}
            <div className="stories-grid">
              {stories.map(story => (
                <StoryCard
                  key={story.id}
                  story={story}
                  isNext={!allDone && story.id === nextStory?.id}
                  isRunning={isRunning}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </>
        )}

        {tab === 'api' && !showLiveRun && (
          <ApiDocs onCreateDemo={handleCreateDemo} creating={creating} />
        )}

        {showLiveRun && (
          <LiveRun
            runId={liveRunId}
            apiKey={liveApiKey}
            onClear={() => { setLiveRunId(''); setLiveApiKey(''); }}
          />
        )}
      </main>
    </div>
  );
}
