import type { EstablishmentId, EstablishmentMemberId, UserId } from '@coaster/common';
import { MemberInvitedEvent, MemberRemovedEvent } from '@coaster/establishment-members';
import { EstablishmentCreatedEvent } from '@coaster/establishments';
import { ShiftCreatedEvent, ShiftDeletedEvent } from '@coaster/shifts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FichitSync } from '../../services/fichit-sync.service';
import { LinkEstablishmentHandler } from './link-establishment.handler';
import { LinkMemberHandler } from './link-member.handler';
import { MirrorShiftHandler, RemoveMirroredShiftHandler } from './mirror-shift.handler';
import { RetireMemberHandler } from './retire-member.handler';

const establishmentId = 'est_1' as EstablishmentId;
const userId = 'usr_1' as UserId;
const memberId = 'mem_1' as EstablishmentMemberId;

const invited = new MemberInvitedEvent(
  establishmentId,
  memberId,
  'ana@ejemplo.es',
  'Bar Pepe',
  'Pepe Ruiz',
  'es',
  userId,
);

describe('Fichit event handlers', () => {
  let sync: any;

  beforeEach(() => {
    sync = {
      ensureCompany: vi.fn().mockResolvedValue('c_1'),
      ensureEmployee: vi.fn().mockResolvedValue('e_1'),
      retireEmployee: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('links the establishment and its owner as soon as it is created', async () => {
    await new LinkEstablishmentHandler(sync as unknown as FichitSync).handle(
      new EstablishmentCreatedEvent(establishmentId, userId),
    );

    expect(sync.ensureCompany).toHaveBeenCalledWith(establishmentId);
    expect(sync.ensureEmployee).toHaveBeenCalledWith(establishmentId, userId);
  });

  it('links a member the moment they join', async () => {
    await new LinkMemberHandler(sync as unknown as FichitSync).handle(invited);

    expect(sync.ensureEmployee).toHaveBeenCalledWith(establishmentId, userId);
  });

  it('retires the employee when the member leaves', async () => {
    await new RetireMemberHandler(sync as unknown as FichitSync).handle(
      new MemberRemovedEvent(establishmentId, memberId, userId),
    );

    expect(sync.retireEmployee).toHaveBeenCalledWith(establishmentId, userId);
  });

  it('never lets a broken Fichit break Coaster', async () => {
    sync.ensureCompany.mockRejectedValue(new Error('Fichit no responde'));
    sync.ensureEmployee.mockRejectedValue(new Error('Fichit no responde'));
    sync.retireEmployee.mockRejectedValue(new Error('Fichit no responde'));

    await expect(
      new LinkEstablishmentHandler(sync as unknown as FichitSync).handle(
        new EstablishmentCreatedEvent(establishmentId, userId),
      ),
    ).resolves.toBeUndefined();
    await expect(new LinkMemberHandler(sync as unknown as FichitSync).handle(invited)).resolves.toBeUndefined();
    await expect(
      new RetireMemberHandler(sync as unknown as FichitSync).handle(
        new MemberRemovedEvent(establishmentId, memberId, userId),
      ),
    ).resolves.toBeUndefined();
  });
});

describe('Fichit shift handlers', () => {
  let sync: any;

  beforeEach(() => {
    sync = {
      mirrorShift: vi.fn().mockResolvedValue('fs_1'),
      removeMirroredShift: vi.fn().mockResolvedValue(undefined),
    };
  });

  const shift = { id: 'sh_1' } as never;

  it('mirrors a shift the moment it is rostered', async () => {
    await new MirrorShiftHandler(sync as unknown as FichitSync).handle(
      new ShiftCreatedEvent(establishmentId, shift),
    );

    expect(sync.mirrorShift).toHaveBeenCalledWith('sh_1');
  });

  it('removes it when the shift is dropped', async () => {
    await new RemoveMirroredShiftHandler(sync as unknown as FichitSync).handle(
      new ShiftDeletedEvent(establishmentId, 'sh_1' as never),
    );

    expect(sync.removeMirroredShift).toHaveBeenCalledWith(establishmentId, 'sh_1');
  });

  it('never lets the roster fail because Fichit did', async () => {
    sync.mirrorShift.mockRejectedValue(new Error('Fichit no responde'));
    sync.removeMirroredShift.mockRejectedValue(new Error('Fichit no responde'));

    await expect(
      new MirrorShiftHandler(sync as unknown as FichitSync).handle(new ShiftCreatedEvent(establishmentId, shift)),
    ).resolves.toBeUndefined();
    await expect(
      new RemoveMirroredShiftHandler(sync as unknown as FichitSync).handle(
        new ShiftDeletedEvent(establishmentId, 'sh_1' as never),
      ),
    ).resolves.toBeUndefined();
  });
});
