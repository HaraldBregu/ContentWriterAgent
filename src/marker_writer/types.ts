export type IntentType = 'continue' | 'expand' | 'rewrite';

export interface Intent {
  type: IntentType;
  detail: string;
}

export interface StyleProfile {
  tense: string;
  pointOfView: string;
  tone: string;
  formality: string;
  genre: string;
  notablePatterns: string[];
}

export interface AssembledPrompt {
  system: string;
  user: string;
}
