import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import * as Handlebars from 'handlebars';
import { InviteEmailTemplate, InviteEmailTranslations } from './templates/invite-email.template';

const renderInvite = Handlebars.compile(InviteEmailTemplate);

@Injectable()
export class EmailService {
  #resend: Resend;
  #logger = new Logger(EmailService.name);

  constructor(private readonly _configService: ConfigService) {
    this.#resend = new Resend(this._configService.get<string>('RESEND_API_KEY') || 're_123_dummy');
  }

  async sendInviteEmail(to: string, establishmentName: string, inviterName: string, lang = 'es') {
    try {
      const translations = InviteEmailTranslations[lang] || InviteEmailTranslations['es'];

      const html = renderInvite({
        ...translations,
        lang,
        establishmentName,
        inviterName,
      });

      await this.#resend.emails.send({
        from: 'Coaster <hello@coaster.business>',
        to,
        subject: translations.subject,
        html,
      });
      this.#logger.debug('Invite email sent successfully');
    } catch (error) {
      this.#logger.error('Failed to send invite email', error);
    }
  }
}
