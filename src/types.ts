export interface UserStory {
  id: string;
  title: string;
  acceptanceCriteria: string[];
  priority: number;
  passes: boolean;
  notes: string;
}

export interface PRD {
  branchName: string;
  userStories: UserStory[];
}

export type GenerationPattern = 'edit_existing' | 'generate_new';

export interface RunConfig {
  system_prompt: string;
  model: string;
  goal: string;
  generation_pattern: GenerationPattern;
  story_order: string[];
}

export const AVAILABLE_MODELS = [
  { id: 'claude-opus-4-5', label: 'Claude Opus 4.5', provider: 'Anthropic' },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', provider: 'Anthropic' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', provider: 'Anthropic' },
  { id: 'claude-opus-4', label: 'Claude Opus 4', provider: 'Anthropic' },
  { id: 'claude-sonnet-4', label: 'Claude Sonnet 4', provider: 'Anthropic' },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'OpenAI' },
  { id: 'o1', label: 'o1', provider: 'OpenAI' },
  { id: 'o1-mini', label: 'o1-mini', provider: 'OpenAI' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'Google' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'Google' },
] as const;

export const DEFAULT_CONFIG: RunConfig = {
  system_prompt: '',
  model: 'claude-opus-4-5',
  goal: '',
  generation_pattern: 'edit_existing',
  story_order: [],
};
