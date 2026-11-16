export interface Player {
  id: string;
  nickname: string;
  avatar: string;
  x: number;
  y: number;
}
export interface Message {
  id: string;
  sessionId: string;
  nickname: string;
  text: string;
  createdAt: string;
}
export interface Progress {
  completed: string[];
  xp: number;
}
export interface Session {
  sessionId: string;
  token: string;
  nickname: string;
  avatar: string;
  progress: Progress;
}
export interface Scenario {
  id: string;
  title: string;
  description: string;
  reward: number;
  steps: {
    id: string;
    prompt: string;
    options: { id: string; text: string }[];
    explanation: string;
  }[];
}
export interface AttemptResult extends Progress {
  passed: boolean;
  score: number;
  total: number;
  xpEarned: number;
  feedback: { correct: boolean; explanation: string }[];
}
export type EventItem = {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  timestamp: string;
};
