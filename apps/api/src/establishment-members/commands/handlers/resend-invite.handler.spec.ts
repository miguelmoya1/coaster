import { AuthTokenRepository } from '@coaster/auth';
import { asEstablishmentId, asEstablishmentMemberId, asRole, asUserId } from '@coaster/common';
import { AUTH_MAILER } from '@coaster/core';
import { DbAuthTokenPurpose } from '@coaster/core/db';
import { ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentMembersReadRepository } from '../../data-access/establishment-members.read.repository';
import { ResendInviteCommand } from '../impl/resend-invite.command';
import { ResendInviteHandler } from './resend-invite.handler';

describe('ResendInviteHandler', () => {
  let handler: ResendInviteHandler;
  const repository = { getMemberById: vi.fn() };
  const tokens = { issue: vi.fn() };
  const mailer = { sendInvite: vi.fn() };

  const inviter = {
    id: asUserId('owner-id'),
    name: 'Owner Name',
    email: 'owner@test.com',
    active: true,
    role: asRole('USER'),
    language: 'es',
    emailVerified: true,
  };

  const command = new ResendInviteCommand(
    asEstablishmentId('establishment-1'),
    asEstablishmentMemberId('member-1'),
    inviter,
  );

  const pendingMember = {
    id: 'member-1',
    userId: 'user-1',
    establishment: { name: 'Bar Paco' },
    user: {
      id: 'user-1',
      name: 'invited',
      email: 'invited@test.com',
      active: true,
      passwordUpdatedAt: null,
      _count: { identities: 0 },
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResendInviteHandler,
        { provide: EstablishmentMembersReadRepository, useValue: repository },
        { provide: AuthTokenRepository, useValue: tokens },
        { provide: AUTH_MAILER, useValue: mailer },
      ],
    }).compile();

    handler = module.get<ResendInviteHandler>(ResendInviteHandler);
  });

  it('should issue a fresh token and send the invitation again', async () => {
    repository.getMemberById.mockResolvedValue(pendingMember);
    tokens.issue.mockResolvedValue('fresh-token');
    mailer.sendInvite.mockResolvedValue(undefined);

    await handler.execute(command);

    expect(repository.getMemberById).toHaveBeenCalledWith(
      asEstablishmentId('establishment-1'),
      asEstablishmentMemberId('member-1'),
    );
    expect(tokens.issue).toHaveBeenCalledWith('user-1', DbAuthTokenPurpose.INVITE);
    expect(mailer.sendInvite).toHaveBeenCalledWith(
      'invited@test.com',
      { establishmentName: 'Bar Paco', inviterName: 'Owner Name', token: 'fresh-token' },
      'es',
    );
  });

  it('should throw NotFoundException when the member is not in the establishment', async () => {
    repository.getMemberById.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);

    expect(tokens.issue).not.toHaveBeenCalled();
    expect(mailer.sendInvite).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when the account behind the member is disabled', async () => {
    repository.getMemberById.mockResolvedValue({
      ...pendingMember,
      user: { ...pendingMember.user, active: false },
    });

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);

    expect(mailer.sendInvite).not.toHaveBeenCalled();
  });

  it('should throw ConflictException when the invitation was already accepted', async () => {
    repository.getMemberById.mockResolvedValue({
      ...pendingMember,
      user: { ...pendingMember.user, passwordUpdatedAt: new Date() },
    });

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);

    expect(tokens.issue).not.toHaveBeenCalled();
    expect(mailer.sendInvite).not.toHaveBeenCalled();
  });

  it('should throw ConflictException when the member already signed in with Google', async () => {
    repository.getMemberById.mockResolvedValue({
      ...pendingMember,
      user: { ...pendingMember.user, _count: { identities: 1 } },
    });

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);

    expect(mailer.sendInvite).not.toHaveBeenCalled();
  });

  it('should say the email did not leave when the mailer refuses it', async () => {
    repository.getMemberById.mockResolvedValue(pendingMember);
    tokens.issue.mockResolvedValue('fresh-token');
    mailer.sendInvite.mockRejectedValue(new Error('domain is not verified'));

    await expect(handler.execute(command)).rejects.toThrow(ServiceUnavailableException);
  });
});
