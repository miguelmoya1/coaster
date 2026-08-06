import { ErrorCodes, SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthService } from './services';

interface AuthenticatedSocket extends Socket {
  data: Socket['data'] & { userId?: string };
}

@WebSocketGateway({ cors: { origin: '*' } })
export class BarGateway implements OnGatewayConnection {
  @WebSocketServer()
  declare server: Server;

  private readonly _logger = new Logger(BarGateway.name);

  constructor(private readonly _wsAuth: WsAuthService) {}

  async handleConnection(client: AuthenticatedSocket) {
    const userId = await this._wsAuth.authenticate(client);

    if (!userId) {
      client.emit(SocketEvents.unauthorized, { message: ErrorCodes.UNAUTHORIZED });
      client.disconnect(true);
      return;
    }

    client.data.userId = userId;
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
