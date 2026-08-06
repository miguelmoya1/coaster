import { io, Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { E2eTestSetup } from '../utils/e2e-setup';

describe('BarGateway (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let socket: Socket;

  let serverUrl: string;

  beforeAll(async () => {
    await testSetup.setup();
    await testSetup.app.listen(0);

    const address = testSetup.app.getHttpServer().address();
    const port = address && typeof address !== 'string' ? address.port : 0;
    serverUrl = `http://localhost:${port}`;

    socket = io(serverUrl, { transports: ['websocket'], auth: { token: 'e2e-token' } });

    await new Promise<void>((resolve) => {
      socket.on('connect', () => {
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (socket) {
      socket.disconnect();
    }
    await testSetup.teardown();
  });

  it('should connect to the WebSocket server', () => {
    expect(socket.connected).toBe(true);
  });

  it('should reject a connection that carries no token', async () => {
    const anonymous = io(serverUrl, { transports: ['websocket'], reconnection: false });

    const outcome = await new Promise<string>((resolve) => {
      anonymous.on('unauthorized', () => resolve('unauthorized'));
      anonymous.on('disconnect', () => resolve('disconnected'));
      setTimeout(() => resolve('still-connected'), 2000);
    });

    expect(['unauthorized', 'disconnected']).toContain(outcome);
    anonymous.disconnect();
  });

  it('should join a bar room via joinBar event', async () => {
    const barId = 'test-bar-123';

    socket.emit('joinBar', barId);

    const response = await new Promise<any>((resolve) => {
      socket.on('joined', (data) => resolve(data));
      setTimeout(() => resolve('timeout'), 1000);
    });

    expect(response).toBe(barId);
  });

  it('should leave a bar room via leaveBar event', async () => {
    const barId = 'test-bar-123';

    socket.emit('leaveBar', barId);

    const response = await new Promise<any>((resolve) => {
      socket.on('left', (data) => resolve(data));
      setTimeout(() => resolve('timeout'), 1000);
    });

    expect(response).toBe(barId);
  });
});
