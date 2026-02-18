import { useState } from 'react';
import type { RunConfig, UserStory } from '../types';
import { AVAILABLE_MODELS, DEFAULT_CONFIG } from '../types';

interface CreateRunWizardProps {
  stories: UserStory[];
  onSubmit: (config: RunConfig) => void;
  submitting: boolean;
}

type Step = 'goal' | 'model' | 'prompt' | 'order';
const STEPS: Step[] = ['goal', 'model', 'prompt', 'order'];
const STEP_LABELS: Record<Step, string> = {
  goal: 'Goal',
  model: 'Model',
  prompt: 'Prompt',
  order: 'Order & Pattern',
};

export function CreateRunWizard({ stories, onSubmit, submitting }: CreateRunWizardProps) {
  const [step, setStep] = useState<Step>('goal');
  const [config, setConfig] = useState<RunConfig>({ ...DEFAULT_CONFIG });
  const [orderedIds, setOrderedIds] = useState<string[]>(
    stories.slice().sort((a, b) => a.priority - b.priority).map(s => s.id)
  );

  const stepIdx = STEPS.indexOf(step);

  const patch = (partial: Partial<RunConfig>) => setConfig(c => ({ ...c, ...partial }));

  const goNext = () => {
    const next = STEPS[stepIdx + 1];
    if (next) setStep(next);
  };
  const goBack = () => {
    const prev = STEPS[stepIdx - 1];
    if (prev) setStep(prev);
  };

  const handleSubmit = () => {
    onSubmit({ ...config, story_order: orderedIds });
  };

  const moveStory = (idx: number, dir: -1 | 1) => {
    setOrderedIds(prev => {
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const storyMap = Object.fromEntries(stories.map(s => [s.id, s]));
  const providers = [...new Set(AVAILABLE_MODELS.map(m => m.provider))];

  return (
    <div className="wizard">
      <div className="wizard-steps">
        {STEPS.map((s, i) => (
          <button
            key={s}
            className={`wizard-step-dot ${s === step ? 'active' : ''} ${i < stepIdx ? 'done' : ''}`}
            onClick={() => setStep(s)}
          >
            <span className="wizard-step-num">{i + 1}</span>
            <span className="wizard-step-label">{STEP_LABELS[s]}</span>
          </button>
        ))}
        <div className="wizard-steps-line" style={{ width: `${(stepIdx / (STEPS.length - 1)) * 100}%` }} />
      </div>

      <div className="wizard-body">
        {step === 'goal' && (
          <GoalStep goal={config.goal} onChange={v => patch({ goal: v })} />
        )}
        {step === 'model' && (
          <ModelStep
            model={config.model}
            onChange={v => patch({ model: v })}
            providers={providers}
          />
        )}
        {step === 'prompt' && (
          <PromptStep
            prompt={config.system_prompt}
            goal={config.goal}
            model={config.model}
            onChange={v => patch({ system_prompt: v })}
          />
        )}
        {step === 'order' && (
          <OrderStep
            orderedIds={orderedIds}
            storyMap={storyMap}
            pattern={config.generation_pattern}
            onMove={moveStory}
            onPatternChange={v => patch({ generation_pattern: v })}
          />
        )}
      </div>

      <div className="wizard-footer">
        {stepIdx > 0 && (
          <button className="ctrl-btn ctrl-reset" onClick={goBack}>
            ← Back
          </button>
        )}
        <div className="wizard-footer-right">
          {stepIdx < STEPS.length - 1 ? (
            <button className="ctrl-btn ctrl-play" onClick={goNext}>
              Next →
            </button>
          ) : (
            <button className="ctrl-btn ctrl-play" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Run'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalStep({ goal, onChange }: { goal: string; onChange: (v: string) => void }) {
  return (
    <div className="wizard-step-content">
      <h3 className="wizard-step-title">What is the goal of this run?</h3>
      <p className="wizard-step-desc">
        Describe the high-level objective. The agent uses this as context when working through each story.
      </p>
      <textarea
        className="wizard-textarea"
        placeholder="e.g. Build a Rust CLI tool that counts words, lines, and bytes in a file — compatible with the POSIX wc interface."
        value={goal}
        onChange={e => onChange(e.target.value)}
        rows={5}
        autoFocus
      />
      <p className="wizard-hint">Optional but recommended. The more specific, the better the agent performs.</p>
    </div>
  );
}

function ModelStep({ model, onChange, providers }: { model: string; onChange: (v: string) => void; providers: string[] }) {
  return (
    <div className="wizard-step-content">
      <h3 className="wizard-step-title">Which model should the agent use?</h3>
      <p className="wizard-step-desc">
        Ralph passes this identifier to the runner script. Make sure your runner supports the chosen model.
      </p>
      {providers.map(provider => (
        <div key={provider} className="model-group">
          <div className="model-group-label">{provider}</div>
          <div className="model-grid">
            {AVAILABLE_MODELS.filter(m => m.provider === provider).map(m => (
              <button
                key={m.id}
                className={`model-card ${model === m.id ? 'model-selected' : ''}`}
                onClick={() => onChange(m.id)}
              >
                <span className="model-name">{m.label}</span>
                <span className="model-id">{m.id}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PromptStep({ prompt, goal, model, onChange }: { prompt: string; goal: string; model: string; onChange: (v: string) => void }) {
  const placeholder = `You are an expert software engineer working on the following goal:\n\n${goal || '<your goal here>'}\n\nYou are using ${model}.\n\nFor each user story:\n1. Read the acceptance criteria carefully\n2. Implement the minimum code needed to satisfy all criteria\n3. Run tests and verify they pass\n4. Output <promise>COMPLETE</promise> when the story is done`;

  return (
    <div className="wizard-step-content">
      <h3 className="wizard-step-title">System prompt</h3>
      <p className="wizard-step-desc">
        This prompt is injected at the start of every agent iteration, before the story details.
        Leave blank to let your runner use its own default prompt.
      </p>
      <textarea
        className="wizard-textarea wizard-textarea--tall"
        placeholder={placeholder}
        value={prompt}
        onChange={e => onChange(e.target.value)}
        rows={10}
        autoFocus
      />
      <p className="wizard-hint">
        Tip: reference the goal and model above, set output format expectations, and tell the agent to emit <code>&lt;promise&gt;COMPLETE&lt;/promise&gt;</code> when done.
      </p>
    </div>
  );
}

interface OrderStepProps {
  orderedIds: string[];
  storyMap: Record<string, UserStory>;
  pattern: string;
  onMove: (idx: number, dir: -1 | 1) => void;
  onPatternChange: (v: 'edit_existing' | 'generate_new') => void;
}

function OrderStep({ orderedIds, storyMap, pattern, onMove, onPatternChange }: OrderStepProps) {
  return (
    <div className="wizard-step-content">
      <div className="order-section">
        <h3 className="wizard-step-title">Story execution order</h3>
        <p className="wizard-step-desc">
          Drag or reorder stories. The agent works through them top to bottom.
        </p>
        <div className="order-list">
          {orderedIds.map((id, idx) => {
            const s = storyMap[id];
            if (!s) return null;
            return (
              <div key={id} className="order-item">
                <span className="order-num">{idx + 1}</span>
                <div className="order-info">
                  <span className="order-id">{s.id}</span>
                  <span className="order-title">{s.title}</span>
                </div>
                <div className="order-arrows">
                  <button className="order-arrow" onClick={() => onMove(idx, -1)} disabled={idx === 0}>▲</button>
                  <button className="order-arrow" onClick={() => onMove(idx, 1)} disabled={idx === orderedIds.length - 1}>▼</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pattern-section">
        <h3 className="wizard-step-title">Continuous generation pattern</h3>
        <p className="wizard-step-desc">
          How should the agent handle each story iteration?
        </p>
        <div className="pattern-cards">
          <button
            className={`pattern-card ${pattern === 'edit_existing' ? 'pattern-selected' : ''}`}
            onClick={() => onPatternChange('edit_existing')}
          >
            <span className="pattern-icon">✏</span>
            <div className="pattern-info">
              <span className="pattern-name">Edit existing</span>
              <span className="pattern-desc">Agent modifies the same codebase incrementally. Each story builds on the last. Best for feature development.</span>
            </div>
          </button>
          <button
            className={`pattern-card ${pattern === 'generate_new' ? 'pattern-selected' : ''}`}
            onClick={() => onPatternChange('generate_new')}
          >
            <span className="pattern-icon">⊕</span>
            <div className="pattern-info">
              <span className="pattern-name">Generate new</span>
              <span className="pattern-desc">Agent produces a fresh output for every story independently. Best for batch content generation or isolated tasks.</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
