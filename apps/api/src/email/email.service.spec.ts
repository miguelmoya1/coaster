import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailService } from './email.service';

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send };
  },
}));

describe('EmailService', () => {
  let service: EmailService;
  let config: Record<string, string | undefined>;

  const sent = () => send.mock.calls[0][0] as { html: string; subject: string; from: string; to: string };

  const createService = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: { get: vi.fn((key: string) => config[key]) } },
      ],
    }).compile();

    return module.get<EmailService>(EmailService);
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    send.mockResolvedValue({ data: { id: 'sent' }, error: null });

    config = {
      RESEND_API_KEY: 'fake-resend-api-key',
      FRONTEND_URL: 'https://beta.coaster.business',
    };

    service = await createService();
  });

  const invite = () => service.sendInvite('nuevo@establishment.com', INVITE, 'es');

  const INVITE = { establishmentName: 'Establishment Pepe', inviterName: 'Miguel', token: 'a-token' };

  describe('the sender', () => {
    it('should fall back to the address the product has always sent from', async () => {
      await invite();

      expect(sent().from).toBe('Coaster <hello@coaster.business>');
    });

    it('should let a deployment name its own sender without touching the code', async () => {
      config.EMAIL_FROM = 'Coaster <hola@midominio.test>';
      service = await createService();

      await invite();

      expect(sent().from).toBe('Coaster <hola@midominio.test>');
    });
  });

  describe('delivery failures', () => {
    it('should raise the alarm when Resend refuses the message', async () => {
      send.mockResolvedValue({ data: null, error: { message: 'domain is not verified' } });

      await expect(invite()).rejects.toThrow(/Could not send/);
    });

    it('should raise the alarm when the call itself fails', async () => {
      send.mockRejectedValue(new Error('network is down'));

      await expect(invite()).rejects.toThrow('network is down');
    });
  });

  describe('sendInvite', () => {
    it('should name the inviter and the establishment instead of leaving placeholders behind', async () => {
      await invite();

      expect(sent().html).toContain('Miguel');
      expect(sent().html).toContain('Establishment Pepe');
      expect(sent().html).not.toContain('{{');
    });

    it('should write the invitation in the requested language', async () => {
      await service.sendInvite('new@establishment.com', INVITE, 'en');

      expect(sent().html).toContain('has invited you to join the team at');
      expect(sent().subject).toBe('You have been invited to Coaster');
    });

    it('should fall back to Spanish for a language it does not know', async () => {
      await service.sendInvite('nuevo@establishment.com', INVITE, 'fr');

      expect(sent().html).toContain('te ha invitado a unirte al equipo de');
    });

    it('should escape an establishment name carrying markup', async () => {
      await service.sendInvite('nuevo@establishment.com', { ...INVITE, establishmentName: '<script>alert(1)</script>' }, 'es');

      expect(sent().html).not.toContain('<script>');
    });

    it('should send the invitee to the token, in the environment that invited them', async () => {
      await invite();

      expect(sent().html).toContain('https://beta.coaster.business/invite/a-token');
    });

    it('should trail no slash when FRONTEND_URL carries one', async () => {
      config.FRONTEND_URL = 'https://beta.coaster.business/';
      service = await createService();

      await invite();

      expect(sent().html).toContain('https://beta.coaster.business/invite/a-token');
    });
  });

  describe('the other three', () => {
    it('should point a verification at the token', async () => {
      await service.sendEmailVerification('alguien@coaster.test', 'Alguien', 'v-token', 'es');

      expect(sent().html).toContain('https://beta.coaster.business/verify-email/v-token');
      expect(sent().subject).toBe('Confirma tu correo en Coaster');
    });

    it('should point a reset at the token', async () => {
      await service.sendEmailVerification('alguien@coaster.test', 'Alguien', 'r-token', 'es');
      send.mockClear();

      await service.sendPasswordReset('alguien@coaster.test', 'Alguien', 'r-token', 'es');

      expect(sent().html).toContain('https://beta.coaster.business/reset-password/r-token');
      expect(sent().subject).toBe('Cambia tu contraseña de Coaster');
    });

    it('should point the changed-password notice at asking for a new one', async () => {
      await service.sendPasswordChanged('alguien@coaster.test', 'Alguien', 'es');

      expect(sent().html).toContain('https://beta.coaster.business/forgot-password');
      expect(sent().html).not.toContain('{{');
    });

    it('should escape a name carrying markup', async () => {
      await service.sendPasswordChanged('alguien@coaster.test', '<img src=x onerror=alert(1)>', 'es');

      expect(sent().html).not.toContain('<img src=x');
    });
  });
});
