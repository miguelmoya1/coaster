export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** What the assistant has cost this establishment so far this month, and what it still has. */
export interface AiUsage {
  used: number;
  allowance: number;
  remaining: number;
  /** Calendar month as YYYY-MM. */
  period: string;
}

export interface AiResponse {
  text: string;
  isError?: boolean;
  errorKey?: string;
}
