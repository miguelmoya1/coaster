import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReadableStream } from 'node:stream/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth } from './auth';
import { Realtime } from './realtime';

const openStream = () => {
  let push!: (text: string) => void;
  let finish!: () => void;

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      push = (text) => controller.enqueue(new TextEncoder().encode(text));
      finish = () => controller.close();
    },
  });

  return { body, push, finish };
};

describe('Realtime', () => {
  let service: Realtime;
  let fetchMock: ReturnType<typeof vi.fn>;
  let consoleError: ReturnType<typeof vi.spyOn>;
  const idToken = signal<string | null | undefined>(undefined);

  const settle = async () => {
    for (let turn = 0; turn < 8; turn++) {
      TestBed.tick();
      await Promise.resolve();
    }
  };

  const reconnect = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await settle();
  };

  const answerWith = (stream: ReturnType<typeof openStream>, status = 200) => {
    fetchMock.mockResolvedValue({ ok: status < 400, status, body: stream.body } as Response);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    idToken.set(undefined);
    consoleError = vi.spyOn(console, 'error').mockReturnValue(undefined);

    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: Auth, useValue: { idToken: idToken.asReadonly() } }],
    });

    service = TestBed.inject(Realtime);
    TestBed.tick();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should not open a stream before a session token exists', async () => {
    service.watch('establishment-1');
    await settle();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should not open a stream before the workspace asks for an establishment', async () => {
    idToken.set('token-123');
    await settle();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should open the stream of the establishment with the session token', async () => {
    answerWith(openStream());

    service.watch('establishment-1');
    idToken.set('token-123');
    await settle();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/establishments/establishment-1/events'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token-123' }) }),
    );
    expect(service.connected()).toBe(true);
  });

  it('should hand a frame to the signal that matches its event', async () => {
    const stream = openStream();
    answerWith(stream);

    service.watch('establishment-1');
    idToken.set('token-123');
    await settle();

    stream.push('event: orderCreated\ndata: {"id":"order-1"}\n\n');
    await settle();

    expect(service.orderCreated()).toEqual({ id: 'order-1' });
  });

  it('should ignore a comment, so a heartbeat never reaches a signal', async () => {
    const stream = openStream();
    answerWith(stream);

    service.watch('establishment-1');
    idToken.set('token-123');
    await settle();

    stream.push(': ping\n\n');
    await settle();

    expect(service.orderCreated()).toBeNull();
    expect(service.connected()).toBe(true);
  });

  it('should ignore an event it does not know', async () => {
    const stream = openStream();
    answerWith(stream);

    service.watch('establishment-1');
    idToken.set('token-123');
    await settle();

    expect(() => stream.push('event: somethingElse\ndata: {}\n\n')).not.toThrow();
    await settle();

    expect(service.orderCreated()).toBeNull();
  });

  it('should ask for what it missed when it comes back', async () => {
    const first = openStream();
    answerWith(first);

    service.watch('establishment-1');
    idToken.set('token-123');
    await settle();

    first.push('id: 1700000000000\nevent: orderCreated\ndata: {"id":"order-1"}\n\n');
    await settle();

    answerWith(openStream());
    first.finish();
    await reconnect();

    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ headers: expect.objectContaining({ 'Last-Event-ID': '1700000000000' }) }),
    );
  });

  it('should not ask for a replay on the first stream of an establishment', async () => {
    answerWith(openStream());

    service.watch('establishment-1');
    idToken.set('token-123');
    await settle();

    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).not.toHaveProperty('Last-Event-ID');
  });

  it('should forget where it was when it moves to another establishment', async () => {
    const first = openStream();
    answerWith(first);

    service.watch('establishment-1');
    idToken.set('token-123');
    await settle();

    first.push('id: 1700000000000\nevent: orderCreated\ndata: {"id":"order-1"}\n\n');
    await settle();

    answerWith(openStream());
    service.watch('establishment-2');
    await settle();

    expect(fetchMock.mock.lastCall?.[1]).toEqual(
      expect.objectContaining({ headers: expect.not.objectContaining({ 'Last-Event-ID': expect.anything() }) }),
    );
  });

  it('should give up when the establishment refuses the stream', async () => {
    answerWith(openStream(), 403);

    service.watch('establishment-1');
    idToken.set('token-123');
    await settle();

    expect(consoleError).toHaveBeenCalled();
    expect(service.connected()).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should report itself disconnected once the stream ends', async () => {
    const stream = openStream();
    answerWith(stream);

    service.watch('establishment-1');
    idToken.set('token-123');
    await settle();

    stream.finish();
    await settle();

    expect(service.connected()).toBe(false);
  });

  it('should abort the stream when the workspace stops watching', async () => {
    const stream = openStream();
    answerWith(stream);

    service.watch('establishment-1');
    idToken.set('token-123');
    await settle();

    const signalPassed = (fetchMock.mock.calls[0][1] as RequestInit).signal;

    service.unwatch('establishment-1');
    await settle();

    expect(signalPassed?.aborted).toBe(true);
    expect(service.connected()).toBe(false);
  });

  it('should drop the stream when the session ends', async () => {
    const stream = openStream();
    answerWith(stream);

    service.watch('establishment-1');
    idToken.set('token-123');
    await settle();

    idToken.set(null);
    await settle();

    const signalPassed = (fetchMock.mock.calls[0][1] as RequestInit).signal;

    expect(signalPassed?.aborted).toBe(true);
    expect(service.connected()).toBe(false);
  });

  it('should move to the stream of the establishment it is asked for next', async () => {
    answerWith(openStream());

    service.watch('establishment-1');
    idToken.set('token-123');
    await settle();

    answerWith(openStream());
    service.watch('establishment-2');
    await settle();

    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining('/establishments/establishment-2/events'),
      expect.anything(),
    );
  });
});
