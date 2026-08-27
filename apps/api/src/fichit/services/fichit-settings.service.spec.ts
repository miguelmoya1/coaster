import type { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FichitRepository } from '../data-access/fichit.repository';
import { open } from '../utils/secret-box';
import { FichitSettings } from './fichit-settings.service';

const key = randomBytes(32).toString('base64');

const config = (values: Record<string, string | undefined>) =>
  ({ get: (name: string) => values[name] }) as unknown as ConfigService;

describe('FichitSettings', () => {
  let repository: any;

  beforeEach(() => {
    repository = {
      fichitSettings: vi.fn().mockResolvedValue(null),
      saveFichitSettings: vi.fn(),
    };
  });

  const build = (values: Record<string, string | undefined> = { SETTINGS_ENCRYPTION_KEY: key }) =>
    new FichitSettings(config(values), repository as unknown as FichitRepository);

  it('falls back to the environment while the database says nothing', async () => {
    const settings = build({
      SETTINGS_ENCRYPTION_KEY: key,
      FICHIT_API_URL: 'https://api.fichit.es/',
      FICHIT_API_KEY: 'fk_del_entorno',
    });

    expect(await settings.current()).toEqual({
      apiUrl: 'https://api.fichit.es',
      apiKey: 'fk_del_entorno',
    });
  });

  it('prefers what the panel saved, so rotating it needs no deploy', async () => {
    const settings = build({
      SETTINGS_ENCRYPTION_KEY: key,
      FICHIT_API_URL: 'https://vieja.fichit.es',
      FICHIT_API_KEY: 'fk_vieja',
    });
    await settings.save('https://api.fichit.es', 'fk_nueva', 'user-1');

    const [apiUrl, cipher] = repository.saveFichitSettings.mock.calls[0];
    repository.fichitSettings.mockResolvedValue({ apiUrl, apiKeyCipher: cipher, updatedAt: new Date() });

    expect(await settings.current()).toEqual({ apiUrl: 'https://api.fichit.es', apiKey: 'fk_nueva' });
  });

  it('never writes the key in the clear', async () => {
    await build().save('https://api.fichit.es', 'fk_secreta', 'user-1');

    const [, cipher] = repository.saveFichitSettings.mock.calls[0];
    expect(cipher).not.toContain('fk_secreta');
    expect(open(cipher, Buffer.from(key, 'base64'))).toBe('fk_secreta');
  });

  it('falls back to the environment when the stored key cannot be read', async () => {
    repository.fichitSettings.mockResolvedValue({
      apiUrl: 'https://api.fichit.es',
      apiKeyCipher: 'esto-no-descifra',
      updatedAt: new Date(),
    });

    const settings = build({
      SETTINGS_ENCRYPTION_KEY: key,
      FICHIT_API_URL: 'https://entorno.fichit.es',
      FICHIT_API_KEY: 'fk_del_entorno',
    });

    expect(await settings.current()).toEqual({
      apiUrl: 'https://entorno.fichit.es',
      apiKey: 'fk_del_entorno',
    });
  });

  it('shows whether a key is set without ever showing the key', async () => {
    const settings = build({ SETTINGS_ENCRYPTION_KEY: key });
    await settings.save('https://api.fichit.es', 'fk_secreta', 'user-1');

    const [apiUrl, cipher] = repository.saveFichitSettings.mock.calls[0];
    const updatedAt = new Date('2026-08-27T10:00:00Z');
    repository.fichitSettings.mockResolvedValue({ apiUrl, apiKeyCipher: cipher, updatedAt });

    const view = await settings.view();

    expect(view).toEqual({
      apiUrl: 'https://api.fichit.es',
      hasApiKey: true,
      storedInDatabase: true,
      updatedAt: updatedAt.toISOString(),
    });
    expect(JSON.stringify(view)).not.toContain('fk_secreta');
  });

  it('forgets what the panel saved and goes back to the environment', async () => {
    await build().forget('user-1');

    expect(repository.saveFichitSettings).toHaveBeenCalledWith(null, null, 'user-1');
  });

  it('refuses to save without an encryption key rather than storing it in the clear', async () => {
    await expect(
      build({ SETTINGS_ENCRYPTION_KEY: undefined }).save('https://api.fichit.es', 'fk_1', 'user-1'),
    ).rejects.toThrow();
    expect(repository.saveFichitSettings).not.toHaveBeenCalled();
  });
});
