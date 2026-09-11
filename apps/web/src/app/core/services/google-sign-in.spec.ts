import { TestBed } from '@angular/core/testing';
import { environment } from '@coaster/env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleSignIn } from './google-sign-in';

describe('GoogleSignIn', () => {
  const originalClientId = environment.googleClientId;

  const initialize = vi.fn();
  const renderButton = vi.fn();

  let host: HTMLElement;

  const build = () => {
    TestBed.configureTestingModule({});

    return TestBed.inject(GoogleSignIn);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();

    host = document.createElement('div');
    document.body.appendChild(host);

    (window as unknown as Record<string, unknown>)['google'] = { accounts: { id: { initialize, renderButton } } };
    environment.googleClientId = 'a-client.apps.googleusercontent.com';
  });

  afterEach(() => {
    host.remove();
    delete (window as unknown as Record<string, unknown>)['google'];
    environment.googleClientId = originalClientId;
  });

  it('should offer the button when a client id is configured', () => {
    expect(build().available()).toBe(true);
  });

  it('should render the Google button into the host', async () => {
    const service = build();

    await service.renderButton(host, () => undefined);

    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'a-client.apps.googleusercontent.com' }),
    );
    expect(renderButton).toHaveBeenCalledWith(
      host,
      expect.objectContaining({ type: 'standard', theme: 'filled_black' }),
    );
  });

  it('should hand the credential straight through', async () => {
    const service = build();
    const onCredential = vi.fn();

    await service.renderButton(host, onCredential);

    initialize.mock.calls[0][0].callback({ credential: 'a-google-credential' });

    expect(onCredential).toHaveBeenCalledWith('a-google-credential');
  });

  it('should not load anything, nor offer a button, without a client id', async () => {
    environment.googleClientId = '';

    const service = build();

    expect(service.available()).toBe(false);

    await service.renderButton(host, () => undefined);

    expect(initialize).not.toHaveBeenCalled();
  });

  it('should stop offering the button when Google refuses to load', async () => {
    delete (window as unknown as Record<string, unknown>)['google'];
    const appendChild = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      queueMicrotask(() => (node as HTMLScriptElement).onerror?.(new Event('error')));

      return node;
    });

    const service = build();

    await service.renderButton(host, () => undefined);

    expect(service.available()).toBe(false);
    expect(initialize).not.toHaveBeenCalled();

    appendChild.mockRestore();
  });
});
