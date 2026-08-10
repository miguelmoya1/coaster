import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaService } from './media.service';

const { getSignedUrl, file } = vi.hoisted(() => {
  const getSignedUrl = vi.fn();
  return { getSignedUrl, file: vi.fn((path: string) => ({ path, getSignedUrl })) };
});

vi.mock('firebase-admin/storage', () => ({
  getStorage: () => ({ bucket: () => ({ file }) }),
}));

describe('MediaService', () => {
  let service: MediaService;

  const pathOfLastUpload = () => file.mock.calls.at(-1)![0];

  beforeEach(async () => {
    vi.clearAllMocks();
    getSignedUrl.mockResolvedValue(['https://signed.example/upload']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [MediaService, { provide: ConfigService, useValue: { get: vi.fn().mockReturnValue(undefined) } }],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  it('should keep the object inside the folder of the establishment that asked for it', async () => {
    await service.generateUploadUrls('establishment-1', 'products', [
      { filename: 'beer.png', contentType: 'image/png' },
    ]);

    expect(pathOfLastUpload()).toMatch(/^establishments\/establishment-1\/products\/[0-9a-f-]+\.png$/);
  });

  it('should not let a filename walk out of that folder', async () => {
    await service.generateUploadUrls('establishment-1', 'products', [
      { filename: '../../../other-establishment/evil.png', contentType: 'image/png' },
    ]);

    const path = pathOfLastUpload();

    expect(path).toMatch(/^establishments\/establishment-1\/products\//);
    expect(path).not.toContain('..');
    expect(path).not.toContain('other-establishment');
  });

  it('should drop an extension it does not recognise', async () => {
    await service.generateUploadUrls('establishment-1', 'products', [
      { filename: 'payload.html', contentType: 'image/png' },
    ]);

    expect(pathOfLastUpload()).not.toContain('.html');
  });

  it('should sign the url for the declared content type and a bounded size', async () => {
    const [response] = await service.generateUploadUrls('establishment-1', 'products', [
      { filename: 'beer.webp', contentType: 'image/webp' },
    ]);

    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 'v4',
        action: 'write',
        contentType: 'image/webp',
        extensionHeaders: { 'x-goog-content-length-range': '0,5242880' },
      }),
    );
    expect(response.uploadHeaders).toEqual({ 'x-goog-content-length-range': '0,5242880' });
  });

  it('should point the public url at the same object it signed', async () => {
    const [response] = await service.generateUploadUrls('establishment-1', 'products', [
      { filename: 'beer.png', contentType: 'image/png' },
    ]);

    expect(response.publicUrl).toBe(`https://storage.googleapis.com/imagenes-clientes-app/${pathOfLastUpload()}`);
  });
});
