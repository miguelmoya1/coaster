import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import * as Handlebars from 'handlebars';
import { InviteEmailTemplate, InviteEmailTranslations } from './templates/invite-email.template';

@Injectable()
export class EmailService {
  #resend: Resend;
  #logger = new Logger(EmailService.name);

  constructor(private readonly _configService: ConfigService) {
    this.#resend = new Resend(this._configService.get<string>('RESEND_API_KEY'));
  }

  async sendInviteEmail(to: string, barName: string, inviterName: string, lang = 'es') {
    try {
      const template = Handlebars.compile(InviteEmailTemplate);
      const translations = InviteEmailTranslations[lang] || InviteEmailTranslations['es'];

      const html = template({
        ...translations,
        lang,
        barName,
        inviterName,
      });

      await this.#resend.emails.send({
        from: 'Coaster <hello@coaster.business>', // Or from ConfigService
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
