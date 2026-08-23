import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

  const sentHtml = () => (send.mock.calls[0][0] as { html: string }).html;

  const createService = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => config[key]),
          },
        },
      ],
    }).compile();

    return module.get<EmailService>(EmailService);
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    send.mockResolvedValue({});

    config = {
      RESEND_API_KEY: 'fake-resend-api-key',
      FRONTEND_URL: 'https://beta.coaster.business',
    };

    service = await createService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendInviteEmail', () => {
    it('should name the inviter and the establishment instead of leaving placeholders behind', async () => {
      await service.sendInviteEmail('nuevo@establishment.com', 'Establishment Pepe', 'Miguel', 'es');

      const html = sentHtml();

      expect(html).toContain('Miguel');
      expect(html).toContain('Establishment Pepe');
      expect(html).not.toContain('{{');
    });

    it('should write the invitation in the requested language', async () => {
      await service.sendInviteEmail('new@establishment.com', 'Pepe Establishment', 'Miguel', 'en');

      const html = sentHtml();

      expect(html).toContain('has invited you to join the team at');
      expect(html).not.toContain('{{');
    });

    it('should fall back to Spanish for a language it does not know', async () => {
      await service.sendInviteEmail('nuevo@establishment.com', 'Establishment Pepe', 'Miguel', 'fr');

      expect(sentHtml()).toContain('te ha invitado a unirte al equipo de');
    });

    it('should escape an establishment name carrying markup', async () => {
      await service.sendInviteEmail('nuevo@establishment.com', '<script>alert(1)</script>', 'Miguel', 'es');

      expect(sentHtml()).not.toContain('<script>');
    });

    it('should send the invitee to the environment that invited them', async () => {
      await service.sendInviteEmail('nuevo@establishment.com', 'Establishment Pepe', 'Miguel', 'es');

      expect(sentHtml()).toContain('https://beta.coaster.business/login');
    });

    it('should trail no slash when FRONTEND_URL carries one', async () => {
      config.FRONTEND_URL = 'https://beta.coaster.business/';
      service = await createService();

      await service.sendInviteEmail('nuevo@establishment.com', 'Establishment Pepe', 'Miguel', 'es');

      expect(sentHtml()).toContain('https://beta.coaster.business/login');
    });
  });
});
