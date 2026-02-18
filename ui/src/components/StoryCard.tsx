import type { UserStory } from '../types';

interface StoryCardProps {
  story: UserStory;
  isNext: boolean;
  onToggle: (id: string) => void;
}

export function StoryCard({ story, isNext, onToggle }: StoryCardProps) {
  return (
    <div className={`story-card ${story.passes ? 'passes' : ''} ${isNext ? 'next' : ''}`}>
      <div className="story-header">
        <div className="story-meta">
          <span className="story-id">{story.id}</span>
          <span className={`story-badge ${story.passes ? 'badge-pass' : isNext ? 'badge-next' : 'badge-pending'}`}>
            {story.passes ? 'Passed' : isNext ? 'Up Next' : 'Pending'}
          </span>
        </div>
        <button
          className={`toggle-btn ${story.passes ? 'btn-undo' : 'btn-pass'}`}
          onClick={() => onToggle(story.id)}
          title={story.passes ? 'Mark as pending' : 'Mark as passed'}
        >
          {story.passes ? '↩ Undo' : '✓ Pass'}
        </button>
      </div>

      <h3 className="story-title">{story.title}</h3>

      <div className="criteria-list">
        {story.acceptanceCriteria.map((criterion, i) => (
          <div key={i} className="criterion">
            <span className={`criterion-check ${story.passes ? 'check-done' : 'check-empty'}`}>
              {story.passes ? '✓' : '○'}
            </span>
            <span className="criterion-text">{criterion}</span>
          </div>
        ))}
      </div>

      {story.notes && (
        <div className="story-notes">
          <span className="notes-label">Notes:</span> {story.notes}
        </div>
      )}
    </div>
  );
}
