import { ErrorCodes, SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthService } from './services';

interface AuthenticatedSocket extends Socket {
  data: { userId?: string };
}

@WebSocketGateway({ cors: { origin: '*' } })
export class BarGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  declare server: Server;

  private readonly _logger = new Logger(BarGateway.name);

  constructor(private readonly _wsAuth: WsAuthService) {}

  afterInit(server: Server) {
    server.use((socket, next) => {
      void this._wsAuth
        .authenticate(socket)
        .then((userId) => {
          (socket as AuthenticatedSocket).data.userId = userId ?? undefined;
          next();
        })
        .catch(() => next());
    });
  }

  handleConnection(client: AuthenticatedSocket) {
    const userId = client.data.userId;

    if (!userId) {
      client.emit(SocketEvents.unauthorized, { message: ErrorCodes.UNAUTHORIZED });
      client.disconnect(true);
      return;
    }

    this._logger.debug(`Cliente ${client.id} autenticado como usuario ${userId}`);
  }

  @SubscribeMessage(SocketEvents.joinBar)
  async handleJoinBar(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() barId: string) {
    if (!barId || typeof barId !== 'string' || barId.trim().length === 0) {
      throw new WsException(ErrorCodes.INVALID_BAR_ID);
    }

    const userId = client.data.userId;

    if (!userId) {
      throw new WsException(ErrorCodes.UNAUTHORIZED);
    }

    const canAccess = await this._wsAuth.canAccessBar(userId, barId);

    if (!canAccess) {
      this._logger.warn(`Usuario ${userId} intentó unirse al bar ${barId} sin pertenecer a él`);
      throw new WsException(ErrorCodes.UNAUTHORIZED);
    }

    await client.join(barId);
    this._logger.debug(`Cliente ${client.id} se unió a la sala del bar: ${barId}`);

    return { event: SocketEvents.joined, data: barId };
  }

  async evictFromBar(barId: string, userId: string) {
    const sockets = await this.server.in(barId).fetchSockets();

    for (const socket of sockets) {
      if ((socket.data as { userId?: string }).userId === userId) {
        await socket.leave(barId);
        this._logger.debug(`Usuario ${userId} sacado de la sala del bar ${barId} tras perder el acceso`);
      }
    }
  }

  @SubscribeMessage(SocketEvents.leaveBar)
  async handleLeaveBar(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() barId: string) {
    if (!barId || typeof barId !== 'string' || barId.trim().length === 0) {
      throw new WsException(ErrorCodes.INVALID_BAR_ID);
    }

    await client.leave(barId);
    this._logger.debug(`Cliente ${client.id} abandonó la sala del bar: ${barId}`);

    return { event: SocketEvents.left, data: barId };
  }
}
