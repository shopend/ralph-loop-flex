import { useState } from 'react';
import { Header } from './components/Header';
import { StoryCard } from './components/StoryCard';
import { prdData } from './data';
import type { UserStory } from './types';
import './App.css';

export default function App() {
  const [stories, setStories] = useState<UserStory[]>(prdData.userStories);

  const passed = stories.filter(s => s.passes).length;
  const nextStory = stories.find(s => !s.passes);
  const allDone = passed === stories.length;

  const handleToggle = (id: string) => {
    setStories(prev =>
      prev.map(s => s.id === id ? { ...s, passes: !s.passes } : s)
    );
  };

  return (
    <div className="app">
      <Header
        branchName={prdData.branchName}
        passed={passed}
        total={stories.length}
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
              onToggle={handleToggle}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
