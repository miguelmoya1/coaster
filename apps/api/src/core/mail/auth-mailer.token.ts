export interface AuthMailer {
  sendInvite(
    to: string,
    invite: { establishmentName: string; inviterName: string; token: string },
    lang?: string,
  ): Promise<void>;
  sendEmailVerification(to: string, name: string, token: string, lang?: string): Promise<void>;
  sendPasswordReset(to: string, name: string, token: string, lang?: string): Promise<void>;
  sendPasswordChanged(to: string, name: string, lang?: string): Promise<void>;
}

export const AUTH_MAILER = 'AUTH_MAILER';
