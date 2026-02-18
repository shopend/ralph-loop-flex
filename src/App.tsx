import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { StoryCard } from './components/StoryCard';
import { prdData } from './data';
import type { UserStory } from './types';
import './App.css';

const TICK_MS = 2200;

export default function App() {
  const [stories, setStories] = useState<UserStory[]>(prdData.userStories);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const passed = stories.filter(s => s.passes).length;
  const nextStory = stories.find(s => !s.passes);
  const allDone = passed === stories.length;

  const handleToggle = (id: string) => {
    setStories(prev =>
      prev.map(s => s.id === id ? { ...s, passes: !s.passes } : s)
    );
  };

  const handlePlay = () => {
    if (allDone) return;
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
  };

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
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (allDone) setIsRunning(false);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, allDone]);

  return (
    <div className="app">
      <Header
        branchName={prdData.branchName}
        passed={passed}
        total={stories.length}
        isRunning={isRunning}
        allDone={allDone}
        onPlay={handlePlay}
        onStop={handleStop}
        onReset={handleReset}
      />

      <main className="main">
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
      </main>
    </div>
  );
}
