import { CacheClient, CacheConnection } from '@coaster/core';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { ServerOptions, Server } from 'socket.io';

const FIRE_AND_FORGET = ['publish', 'subscribe', 'psubscribe', 'unsubscribe', 'punsubscribe'] as const;

export class SharedIoAdapter extends IoAdapter {
  readonly #logger = new Logger(SharedIoAdapter.name);
  #buildAdapter?: ReturnType<typeof createAdapter>;
  #dropped = false;

  constructor(private readonly _app: INestApplicationContext) {
    super(_app);
  }

  connect() {
    const connection = this._app.get(CacheConnection);
    const publisher = connection.open('socket-pub');
    const subscriber = connection.open('socket-sub');

    if (!publisher || !subscriber) {
      this.#logger.warn('Rooms stay inside this instance: a client on another one will not see its events');
      return;
    }

    this.#buildAdapter = createAdapter(this.#silence(publisher), this.#silence(subscriber));
    this.#logger.log('Rooms are shared across instances');
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;

    if (this.#buildAdapter) {
      server.adapter(this.#buildAdapter);
    }

    return server;
  }

  #silence(client: CacheClient): CacheClient {
    const target = client as unknown as Record<string, (...args: unknown[]) => unknown>;

    for (const command of FIRE_AND_FORGET) {
      const original = target[command];

      target[command] = (...args: unknown[]) => {
        const answer: unknown = original.apply(client, args);

        return answer instanceof Promise ? answer.catch((error: Error) => this.#drop(command, error)) : answer;
      };
    }

    return client;
  }

  #drop(command: string, error: Error) {
    if (!this.#dropped) {
      this.#dropped = true;
      this.#logger.warn(
        `The shared bus refused ${command} (${error.message}); events reach only the clients on this instance`,
      );
    }
  }
}
