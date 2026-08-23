import { RealtimeEventPayloads, RealtimeEvents } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { RealtimeBus } from './realtime.bus';
import { RealtimeRegistry } from './realtime.registry';

@Injectable()
export class RealtimeService {
  constructor(
    private readonly _registry: RealtimeRegistry,
    private readonly _bus: RealtimeBus,
  ) {}

  publish<TEvent extends RealtimeEvents>(
    establishmentId: string,
    event: TEvent,
    payload: RealtimeEventPayloads[TEvent],
  ) {
    const frame = { id: String(Date.now()), event, payload };

    this._registry.deliver(establishmentId, frame);
    this._bus.publishEvent(establishmentId, frame);
    this._bus.remember(establishmentId, frame);
  }

  revoke(establishmentId: string, userId: string) {
    this._registry.revoke(establishmentId, userId);
    this._bus.publishRevoke(establishmentId, userId);
  }
}
