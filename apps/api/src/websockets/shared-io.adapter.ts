import { CacheConnection } from '@coaster/core';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { ServerOptions, Server } from 'socket.io';

export class SharedIoAdapter extends IoAdapter {
  readonly #logger = new Logger(SharedIoAdapter.name);
  #buildAdapter?: ReturnType<typeof createAdapter>;

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

    this.#buildAdapter = createAdapter(publisher, subscriber);
    this.#logger.log('Rooms are shared across instances');
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;

    if (this.#buildAdapter) {
      server.adapter(this.#buildAdapter);
    }

    return server;
  }
}
