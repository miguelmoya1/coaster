import { User } from './user.interface';

export interface AuthSession {
  user: User;
  accessToken: string;
  expiresIn: number;
}

export interface InviteSummary {
  email: string;
  name: string;
  hasCredentials: boolean;
}

export type AuthProvider = 'GOOGLE';

export interface LinkedIdentity {
  provider: AuthProvider;
  email: string;
  linkedAt: string;
}

export interface AccountSummary {
  email: string;
  name: string;
  emailVerified: boolean;
  hasPassword: boolean;
  identities: LinkedIdentity[];
}
