import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FichitApi, FichitError } from './fichit-api.service';
import type { FichitSettings } from './fichit-settings.service';

const settings = (apiUrl: string, apiKey: string) =>
  ({ current: async () => ({ apiUrl: apiUrl.replace(/\/+$/, ''), apiKey }) }) as unknown as FichitSettings;

const configured = settings('https://api.fichit.es/', 'fk_una_clave');

describe('FichitApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  const ok = (body: unknown, status = 200) =>
    ({ ok: true, status, text: async () => JSON.stringify(body) }) as Response;

  it('is disabled without a url or a key, so Coaster works with no Fichit in front', async () => {
    expect(await new FichitApi(settings('', '')).isEnabled()).toBe(false);
    expect(await new FichitApi(settings('https://api.fichit.es', '')).isEnabled()).toBe(false);
    expect(await new FichitApi(settings('', 'fk_1')).isEnabled()).toBe(false);
    expect(await new FichitApi(configured).isEnabled()).toBe(true);
  });

  it('sends the establishment id as the external id, which is what makes a retry safe', async () => {
    fetchMock.mockResolvedValue(ok({ existing: false, company: { id: 'c_1' } }, 201));

    await new FichitApi(configured).createCompany({
      externalId: 'est_1',
      name: 'Bar Pepe',
      taxId: null,
      ownerName: 'Pepe',
      ownerEmail: 'pepe@ejemplo.es',
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.fichit.es/api/v1/partner/companies');
    expect(JSON.parse(init.body)).toMatchObject({ external_id: 'est_1', name: 'Bar Pepe' });
    expect(init.headers.Authorization).toBe('Bearer fk_una_clave');
  });

  it('names the company it acts on when syncing an employee', async () => {
    fetchMock.mockResolvedValue(ok({ created: true, employee: { id: 'e_1' } }, 201));

    await new FichitApi(configured).syncEmployee('c_1', {
      externalId: 'usr_1',
      fullName: 'Ana García',
      email: 'ana@ejemplo.es',
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['Fichit-Company']).toBe('c_1');
  });

  it('turns an unreachable Fichit into an error the caller can retry, not a crash', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      new FichitApi(configured).listCompanies(),
    ).rejects.toMatchObject({ status: 0, code: 'UNREACHABLE' });
  });

  it('carries the error code Fichit returned', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => JSON.stringify({ error: { code: 'not_found', message: 'empresa no encontrada' } }),
    } as Response);

    const failure = await new FichitApi(configured)
      .syncEmployee('c_1', { externalId: 'usr_1', fullName: 'Ana' })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(FichitError);
    expect(failure).toMatchObject({ status: 404, code: 'not_found' });
  });

  it('accepts an empty body on a deactivation', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 } as Response);

    await expect(
      new FichitApi(configured).deactivateEmployee('c_1', 'e_1'),
    ).resolves.toBeUndefined();
  });
});
