import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { E2eTestSetup } from '../utils/e2e-setup';
import { io, Socket } from 'socket.io-client';

describe('BarGateway (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let socket: Socket;

  beforeAll(async () => {
    await testSetup.setup();
    
    // Connect a socket client to the fastify server
    const address = testSetup.app.getHttpServer().address();
    let port = 0;
    if (address && typeof address !== 'string') {
      port = address.port;
    }
    
    // We need the server to be listening on a real port for WS client to connect
    await testSetup.app.listen(0);
    const serverUrl = `http://localhost:${testSetup.app.getHttpServer().address()?.port}`;

    socket = io(serverUrl, { transports: ['websocket'] });
    
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

  it('should join a bar room via joinBar event', async () => {
    const barId = 'test-bar-123';
    
    socket.emit('joinBar', barId);
    
    // Currently the server responds with a message when joined, let's wait for any ack if present
    // The Gateway handler returns { event: 'joined', data: barId } but socket.io doesn't auto-send it to the client
    // unless using emit or WsResponse
    // Wait, let's just listen for 'joined' event
    const response = await new Promise<any>((resolve) => {
      socket.on('joined', (data) => resolve(data));
      // Give it a timeout so it doesn't hang forever
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
