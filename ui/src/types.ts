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
