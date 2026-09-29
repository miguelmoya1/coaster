import {
  computed,
  effect,
  inject,
  OnDestroy,
  Service,
  signal,
  untracked,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { environment } from '@coaster/env';
import { RealtimeEvents } from '../models/realtime-events.type';
import { readSse, SseFrame } from '../utils/sse.utils';
import { Auth } from './auth';

const API_VERSION = 'api/v1';
const RETRY_FLOOR_MS = 1000;
const RETRY_CEILING_MS = 30_000;
const STABLE_STREAM_MS = 10_000;

@Service()
export class Realtime implements OnDestroy {
  readonly #auth = inject(Auth);
  readonly #hasSession = computed(() => Boolean(this.#auth.accessToken()));
  readonly #establishmentId = signal<string | null>(null);
  readonly #connected = signal(false);
  readonly connected = this.#connected.asReadonly();

  readonly #inbox = Object.fromEntries(
    Object.values(RealtimeEvents).map((event) => [event, signal<unknown>(null)]),
  ) as Record<RealtimeEvents, WritableSignal<unknown>>;

  on<T>(event: RealtimeEvents): Signal<T | null> {
    return this.#inbox[event] as Signal<T | null>;
  }

  #abort: AbortController | null = null;
  #lastEventId: string | null = null;
  #generation = 0;

  constructor() {
    effect(() => {
      const establishmentId = this.#establishmentId();
      const hasSession = this.#hasSession();

      this.#stop();

      if (establishmentId && hasSession) {
        void this.#watch(establishmentId, this.#generation);
      }
    });
  }

  public watch(establishmentId: string) {
    this.#establishmentId.set(establishmentId);
  }

  public unwatch(establishmentId: string) {
    if (this.#establishmentId() === establishmentId) {
      this.#establishmentId.set(null);
    }
  }

  async #watch(establishmentId: string, generation: number) {
    let attempt = 0;

    while (generation === this.#generation) {
      const startedAt = Date.now();
      const refused = await this.#stream(establishmentId);

      this.#connected.set(false);

      if (refused || generation !== this.#generation) {
        return;
      }

      attempt = Date.now() - startedAt > STABLE_STREAM_MS ? 0 : attempt + 1;
      await this.#pause(attempt);
    }
  }

  async #stream(establishmentId: string): Promise<boolean> {
    const token = untracked(this.#auth.accessToken);

    if (!token) {
      return false;
    }

    const abort = new AbortController();
    this.#abort = abort;

    try {
      const response = await fetch(`${environment.apiUrl}/${API_VERSION}/establishments/${establishmentId}/events`, {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: 'text/event-stream',
          ...(this.#lastEventId ? { 'Last-Event-ID': this.#lastEventId } : {}),
        },
        signal: abort.signal,
      });

      if (response.status === 403) {
        console.error(`No longer allowed to watch establishment ${establishmentId}`);
        return true;
      }

      if (!response.ok || !response.body) {
        return false;
      }

      this.#connected.set(true);

      for await (const frame of readSse(response.body)) {
        this.#receive(frame);
      }

      return false;
    } catch {
      return false;
    }
  }

  #receive(frame: SseFrame) {
    if (frame.id) {
      this.#lastEventId = frame.id;
    }

    this.#inbox[frame.event as RealtimeEvents]?.set(JSON.parse(frame.data) as unknown);
  }

  #pause(attempt: number): Promise<void> {
    const ceiling = Math.min(RETRY_CEILING_MS, RETRY_FLOOR_MS * 2 ** (attempt - 1));
    const delay = ceiling * (0.5 + Math.random() / 2);

    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  #stop() {
    this.#generation += 1;
    this.#abort?.abort();
    this.#abort = null;
    this.#lastEventId = null;
    this.#connected.set(false);
  }

  ngOnDestroy() {
    this.#establishmentId.set(null);
    this.#stop();
  }
}
