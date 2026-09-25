import { CatalogueImportedEvent } from '@coaster/catalogue';
import { asEstablishmentId, RealtimeEvents } from '@coaster/common';
import { describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { CatalogueImportedHandler } from './catalogue-imported.handler';

describe('CatalogueImportedHandler', () => {
  it('should tell the establishment its catalogue changed', () => {
    const realtime = { publish: vi.fn() };
    const handler = new CatalogueImportedHandler(realtime as unknown as RealtimeService);

    handler.handle(new CatalogueImportedEvent(asEstablishmentId('establishment-1')));

    expect(realtime.publish).toHaveBeenCalledWith('establishment-1', RealtimeEvents.catalogueImported, {
      establishmentId: 'establishment-1',
    });
  });
});
