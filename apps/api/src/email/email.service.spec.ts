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

  const sentHtml = () => (send.mock.calls[0][0] as { html: string }).html;

  beforeEach(async () => {
    vi.clearAllMocks();
    send.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockReturnValue('fake-resend-api-key'),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendInviteEmail', () => {
    it('should name the inviter and the bar instead of leaving placeholders behind', async () => {
      await service.sendInviteEmail('nuevo@bar.com', 'Bar Pepe', 'Miguel', 'es');

      const html = sentHtml();

      expect(html).toContain('Miguel');
      expect(html).toContain('Bar Pepe');
      expect(html).not.toContain('{{');
    });

    it('should write the invitation in the requested language', async () => {
      await service.sendInviteEmail('new@bar.com', 'Pepe Bar', 'Miguel', 'en');

      const html = sentHtml();

      expect(html).toContain('has invited you to join the team at');
      expect(html).not.toContain('{{');
    });

    it('should fall back to Spanish for a language it does not know', async () => {
      await service.sendInviteEmail('nuevo@bar.com', 'Bar Pepe', 'Miguel', 'fr');

      expect(sentHtml()).toContain('te ha invitado a unirte al equipo de');
    });

    it('should escape a bar name carrying markup', async () => {
      await service.sendInviteEmail('nuevo@bar.com', '<script>alert(1)</script>', 'Miguel', 'es');

      expect(sentHtml()).not.toContain('<script>');
    });
  });
});
