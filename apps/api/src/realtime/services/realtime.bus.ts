import { CacheConnection } from '@coaster/core';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RealtimeFrame, RealtimeRegistry } from './realtime.registry';

const CHANNEL = 'coaster:realtime';
const REPLAY_WINDOW_MS = 120_000;

const replayKey = (establishmentId: string) => `realtime:${establishmentId}:replay`;

type BusMessage =
  | { origin: string; kind: 'event'; establishmentId: string; frame: RealtimeFrame }
  | { origin: string; kind: 'revoke'; establishmentId: string; userId: string };

@Injectable()
export class RealtimeBus implements OnModuleInit {
  readonly #logger = new Logger(RealtimeBus.name);
  readonly #origin = randomUUID();
  #dropped = false;

  constructor(
    private readonly _connection: CacheConnection,
    private readonly _registry: RealtimeRegistry,
  ) {}

  onModuleInit() {
    const subscriber = this._connection.open('realtime-sub');

    if (!subscriber) {
      this.#logger.warn('Events reach only the clients on this instance: there is no shared bus');
      return;
    }

    subscriber.on('message', (_channel: string, message: string) => this.#receive(message));

    subscriber.subscribe(CHANNEL).then(
      () => this.#logger.log('Events are shared across instances'),
      (error: Error) => this.#drop('subscribe', error),
    );
  }

  publishEvent(establishmentId: string, frame: RealtimeFrame) {
    this.#send({ origin: this.#origin, kind: 'event', establishmentId, frame });
  }

  publishRevoke(establishmentId: string, userId: string) {
    this.#send({ origin: this.#origin, kind: 'revoke', establishmentId, userId });
  }

  remember(establishmentId: string, frame: RealtimeFrame) {
    const client = this._connection.client;

    if (!client) {
      return;
    }

    const key = replayKey(establishmentId);
    const score = Number(frame.id);

    client
      .pipeline()
      .zadd(key, score, JSON.stringify(frame))
      .zremrangebyscore(key, '-inf', score - REPLAY_WINDOW_MS)
      .pexpire(key, REPLAY_WINDOW_MS)
      .exec()
      .catch((error: Error) => this.#drop('the replay buffer', error));
  }

  async replay(establishmentId: string, sinceId: string): Promise<RealtimeFrame[]> {
    const client = this._connection.client;

    if (!client || !Number.isFinite(Number(sinceId))) {
      return [];
    }

    try {
      const stored = await client.zrangebyscore(replayKey(establishmentId), sinceId, '+inf');

      return stored.map((raw) => this.#parse(raw)).filter((frame): frame is RealtimeFrame => frame !== null);
    } catch (error) {
      this.#drop('the replay buffer', error as Error);
      return [];
    }
  }

  #send(message: BusMessage) {
    const publisher = this._connection.client;

    if (!publisher) {
      return;
    }

    publisher.publish(CHANNEL, JSON.stringify(message)).catch((error: Error) => this.#drop('publish', error));
  }

  #receive(raw: string) {
    const message = this.#parse<BusMessage>(raw);

    if (!message || message.origin === this.#origin) {
      return;
    }

    if (message.kind === 'revoke') {
      this._registry.revoke(message.establishmentId, message.userId);
      return;
    }

    this._registry.deliver(message.establishmentId, message.frame);
  }

  #parse<T = RealtimeFrame>(raw: string): T | null {
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      this.#logger.warn(`Discarding an unreadable message on ${CHANNEL}: ${(error as Error).message}`);
      return null;
    }
  }

  #drop(command: string, error: Error) {
    if (this.#dropped) {
      return;
    }

    this.#dropped = true;
    this.#logger.warn(
      `The shared bus refused ${command} (${error.message}); events reach only the clients on this instance`,
    );
  }
}
