export interface SseFrame {
  id?: string;
  event: string;
  data: string;
}

export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<SseFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        return;
      }

      buffer += decoder.decode(value, { stream: true });

      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';

      for (const chunk of chunks) {
        const frame = parseFrame(chunk);

        if (frame) {
          yield frame;
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

function parseFrame(chunk: string): SseFrame | null {
  let id: string | undefined;
  let event = 'message';
  const data: string[] = [];

  for (const line of chunk.split('\n')) {
    if (line.startsWith('id:')) {
      id = line.slice(3).trim();
    } else if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      data.push(line.slice(5).replace(/^ /, ''));
    }
  }

  return data.length > 0 ? { id, event, data: data.join('\n') } : null;
}
