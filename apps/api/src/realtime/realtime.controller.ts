import { CurrentUser, FirebaseAuthGuard } from '@coaster/auth';
import type { EstablishmentId, User } from '@coaster/common';
import { EstablishmentPermissionsGuard } from '@coaster/core';
import { Controller, Get, Headers, Logger, Param, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { RealtimeBus, RealtimeRegistry, RealtimeStream } from './services';

@Controller('establishments/:establishmentId')
@UseGuards(FirebaseAuthGuard, EstablishmentPermissionsGuard)
export class RealtimeController {
  readonly #logger = new Logger(RealtimeController.name);

  constructor(
    private readonly _registry: RealtimeRegistry,
    private readonly _bus: RealtimeBus,
  ) {}

  @Get('events')
  watch(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @CurrentUser() user: User,
    @Res() reply: FastifyReply,
    @Headers('last-event-id') lastEventId?: string,
  ): Promise<void> {
    const inheritedHeaders = reply.getHeaders() as Record<string, number | string | string[]>;
    reply.hijack();

    reply.raw.writeHead(200, {
      ...inheritedHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    return new Promise<void>((resolve) => {
      const stream = new RealtimeStream(user.id, reply.raw, () => {
        remove();
        this.#logger.debug(`User ${user.id} stopped watching establishment ${establishmentId}`);
        resolve();
      });

      const remove = this._registry.add(establishmentId, stream);

      stream.start();
      this.#logger.debug(`User ${user.id} is watching establishment ${establishmentId}`);

      if (lastEventId) {
        void this._bus.replay(establishmentId, lastEventId).then((frames) => {
          for (const frame of frames) {
            stream.deliver(frame);
          }
        });
      }
    });
  }
}
