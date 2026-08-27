import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FichitRepository } from '../data-access/fichit.repository';
import { open, readKey, seal } from '../utils/secret-box';

export interface FichitCredentials {
  apiUrl: string;
  apiKey: string;
}

export interface FichitSettingsView {
  apiUrl: string;
  hasApiKey: boolean;
  storedInDatabase: boolean;
  updatedAt: string | null;
}

@Injectable()
export class FichitSettings {
  readonly #logger = new Logger(FichitSettings.name);

  constructor(
    private readonly _configService: ConfigService,
    private readonly repository: FichitRepository,
  ) {}

  public async current(): Promise<FichitCredentials> {
    const stored = await this.repository.fichitSettings();

    if (stored?.apiUrl && stored.apiKeyCipher) {
      try {
        return { apiUrl: this.#trim(stored.apiUrl), apiKey: open(stored.apiKeyCipher, this.#key()) };
      } catch (error) {
        this.#logger.error('No se pudo descifrar la clave de Fichit; se usa la del entorno', error);
      }
    }

    return {
      apiUrl: this.#trim(this._configService.get<string>('FICHIT_API_URL') ?? ''),
      apiKey: this._configService.get<string>('FICHIT_API_KEY') ?? '',
    };
  }

  public async view(): Promise<FichitSettingsView> {
    const stored = await this.repository.fichitSettings();
    const credentials = await this.current();

    return {
      apiUrl: credentials.apiUrl,
      hasApiKey: Boolean(credentials.apiKey),
      storedInDatabase: Boolean(stored?.apiUrl && stored.apiKeyCipher),
      updatedAt: stored?.updatedAt?.toISOString() ?? null,
    };
  }

  public async save(apiUrl: string, apiKey: string, actorId: string): Promise<void> {
    await this.repository.saveFichitSettings(this.#trim(apiUrl), seal(apiKey, this.#key()), actorId);
  }

  public async forget(actorId: string): Promise<void> {
    await this.repository.saveFichitSettings(null, null, actorId);
  }

  #key(): Buffer {
    return readKey(this._configService.get<string>('SETTINGS_ENCRYPTION_KEY'));
  }

  #trim(url: string): string {
    return url.replace(/\/+$/, '');
  }
}
