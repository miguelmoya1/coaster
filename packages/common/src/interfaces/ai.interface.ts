export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiResponse {
  text: string;
  isError?: boolean;
  errorKey?: string;
}
