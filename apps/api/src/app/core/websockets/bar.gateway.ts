import { ErrorCodes, SocketEvents } from '@coaster/logic';
import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class BarGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  declare server: Server;

  private readonly _logger = new Logger(BarGateway.name);

  handleConnection(client: Socket) {
    this._logger.debug(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this._logger.debug(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage(SocketEvents.JOIN_BAR)
  handleJoinBar(@ConnectedSocket() client: Socket, @MessageBody() barId: string) {
    if (!barId || typeof barId !== 'string' || barId.trim().length === 0) {
      throw new WsException(ErrorCodes.INVALID_BAR_ID);
    }

    client.join(barId);
    this._logger.debug(`Cliente ${client.id} se unió a la sala del bar: ${barId}`);

    return { event: SocketEvents.JOINED, data: barId };
  }

  @SubscribeMessage(SocketEvents.LEAVE_BAR)
  handleLeaveBar(@ConnectedSocket() client: Socket, @MessageBody() barId: string) {
    if (!barId || typeof barId !== 'string' || barId.trim().length === 0) {
      throw new WsException(ErrorCodes.INVALID_BAR_ID);
    }

    client.leave(barId);
    this._logger.debug(`Cliente ${client.id} abandonó la sala del bar: ${barId}`);

    return { event: SocketEvents.LEFT, data: barId };
  }
}
