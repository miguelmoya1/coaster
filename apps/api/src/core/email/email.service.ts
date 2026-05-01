import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  #resend: Resend;
  #logger = new Logger(EmailService.name);

  constructor(private readonly _configService: ConfigService) {
    this.#resend = new Resend(this._configService.get<string>('RESEND_API_KEY'));
  }

  async sendInviteEmail(to: string, barName: string, inviterName: string) {
    try {
      const template = await this.#resend.templates.get('invite-email');

      const templateId = template.data?.id;

      if (!templateId) {
        throw new Error('Template not found');
      }

      await this.#resend.emails.send({
        to,
        template: {
          id: templateId,
          variables: {
            barName,
            inviterName,
          },
        },
      });
      this.#logger.debug('Invite email sent successfully');
    } catch (error) {
      this.#logger.error('Failed to send invite email', error);
    }
  }
}
