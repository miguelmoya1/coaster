import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleOAuthService {
  private readonly oauthClient: OAuth2Client;

  constructor(private readonly _configService: ConfigService) {
    const clientId = this._configService.get<string>(
      'GOOGLE_CLIENT_ID',
      'unconfigured_client_id',
    );
    this.oauthClient = new OAuth2Client(clientId);
  }

  get client(): OAuth2Client {
    return this.oauthClient;
  }
}
