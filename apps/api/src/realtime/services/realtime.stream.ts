import type { ServerResponse } from 'node:http';
import { RealtimeFrame, RealtimeSubscriber } from './realtime.registry';

const HEARTBEAT_MS = 25_000;
const MAX_LIFETIME_MS = 30 * 60_000;

export class RealtimeStream implements RealtimeSubscriber {
  readonly #response: ServerResponse;
  readonly #onClose: () => void;
  #heartbeat?: NodeJS.Timeout;
  #lifetime?: NodeJS.Timeout;
  #open = true;

  constructor(
    readonly userId: string,
    response: ServerResponse,
    onClose: () => void,
  ) {
    this.#response = response;
    this.#onClose = onClose;
  }

  start() {
    this.#heartbeat = setInterval(() => this.#write(': ping\n\n'), HEARTBEAT_MS).unref();
    this.#lifetime = setTimeout(() => this.close(), MAX_LIFETIME_MS).unref();
    this.#response.on('close', () => this.close());
    this.#write(': open\n\n');
  }

  deliver(frame: RealtimeFrame) {
    this.#write(`id: ${frame.id}\nevent: ${frame.event}\ndata: ${JSON.stringify(frame.payload)}\n\n`);
  }

  close() {
    if (!this.#open) {
      return;
    }

    this.#open = false;
    clearInterval(this.#heartbeat);
    clearTimeout(this.#lifetime);
    this.#onClose();
    this.#response.end();
  }

  #write(frame: string) {
    if (!this.#open) {
      return;
    }

    try {
      this.#response.write(frame);
    } catch {
      this.close();
    }
  }
}
