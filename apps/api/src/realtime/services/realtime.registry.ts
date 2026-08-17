import { RealtimeEvents } from '@coaster/common';
import { Injectable } from '@nestjs/common';

export interface RealtimeFrame {
  id: string;
  event: RealtimeEvents;
  payload: unknown;
}

export interface RealtimeSubscriber {
  readonly userId: string;
  deliver(frame: RealtimeFrame): void;
  close(): void;
}

@Injectable()
export class RealtimeRegistry {
  readonly #byEstablishment = new Map<string, Set<RealtimeSubscriber>>();

  add(establishmentId: string, subscriber: RealtimeSubscriber): () => void {
    const subscribers = this.#byEstablishment.get(establishmentId) ?? new Set<RealtimeSubscriber>();

    subscribers.add(subscriber);
    this.#byEstablishment.set(establishmentId, subscribers);

    return () => this.#remove(establishmentId, subscriber);
  }

  deliver(establishmentId: string, frame: RealtimeFrame) {
    for (const subscriber of this.#snapshot(establishmentId)) {
      subscriber.deliver(frame);
    }
  }

  revoke(establishmentId: string, userId: string) {
    for (const subscriber of this.#snapshot(establishmentId)) {
      if (subscriber.userId === userId) {
        subscriber.close();
      }
    }
  }

  countFor(establishmentId: string): number {
    return this.#byEstablishment.get(establishmentId)?.size ?? 0;
  }

  #snapshot(establishmentId: string): RealtimeSubscriber[] {
    return [...(this.#byEstablishment.get(establishmentId) ?? [])];
  }

  #remove(establishmentId: string, subscriber: RealtimeSubscriber) {
    const subscribers = this.#byEstablishment.get(establishmentId);

    if (!subscribers) {
      return;
    }

    subscribers.delete(subscriber);

    if (subscribers.size === 0) {
      this.#byEstablishment.delete(establishmentId);
    }
  }
}
