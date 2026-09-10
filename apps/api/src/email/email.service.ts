import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailKind, renderEmail } from './templates/emails';

export const EMAIL_FROM = 'EMAIL_FROM';

const DEFAULT_FROM = 'Coaster <hello@coaster.business>';

@Injectable()
export class EmailService {
  readonly #resend: Resend;
  readonly #logger = new Logger(EmailService.name);

  constructor(private readonly _configService: ConfigService) {
    this.#resend = new Resend(this._configService.get<string>('RESEND_API_KEY') || 're_123_dummy');
  }

  private get frontendUrl(): string {
    return (this._configService.get<string>('FRONTEND_URL') || 'http://localhost:4200').replace(/\/+$/, '');
  }

  private get from(): string {
    return this._configService.get<string>(EMAIL_FROM) || DEFAULT_FROM;
  }

  public async sendInvite(
    to: string,
    invite: { establishmentName: string; inviterName: string; token: string },
    lang = 'es',
  ): Promise<void> {
    await this.#send(to, 'invite', lang, `${this.frontendUrl}/invite/${invite.token}`, {
      establishmentName: invite.establishmentName,
      inviterName: invite.inviterName,
    });
  }

  public async sendEmailVerification(to: string, name: string, token: string, lang = 'es'): Promise<void> {
    await this.#send(to, 'verifyEmail', lang, `${this.frontendUrl}/verify-email/${token}`, { name });
  }

  public async sendPasswordReset(to: string, name: string, token: string, lang = 'es'): Promise<void> {
    await this.#send(to, 'resetPassword', lang, `${this.frontendUrl}/reset-password/${token}`, { name });
  }

  public async sendPasswordChanged(to: string, name: string, lang = 'es'): Promise<void> {
    await this.#send(to, 'passwordChanged', lang, `${this.frontendUrl}/forgot-password`, { name });
  }

  async #send(
    to: string,
    kind: EmailKind,
    lang: string,
    actionUrl: string,
    values: Record<string, string>,
  ): Promise<void> {
    const { subject, html } = renderEmail(kind, lang, actionUrl, values);

    const { error } = await this.#resend.emails.send({ from: this.from, to, subject, html });

    if (error) {
      this.#logger.error(`Resend refused the ${kind} email to ${to}: ${error.message}`);

      throw new Error(`Could not send the ${kind} email`);
    }

    this.#logger.debug(`Sent the ${kind} email to ${to}`);
  }
}
