export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiUsage {
  used: number;
  allowance: number;
  remaining: number;
  period: string;
}

export interface AiResponse {
  text: string;
  isError?: boolean;
  errorKey?: string;
}
