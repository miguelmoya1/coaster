import { ErrorCodes, SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
// implements OnGatewayConnection, OnGatewayDisconnect
export class BarGateway {
  @WebSocketServer()
  declare server: Server;

  private readonly _logger = new Logger(BarGateway.name);

  handleConnection(_client: Socket) {
    // this._logger.debug(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(_client: Socket) {
    // this._logger.debug(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage(SocketEvents.joinBar)
  handleJoinBar(@ConnectedSocket() client: Socket, @MessageBody() barId: string) {
    if (!barId || typeof barId !== 'string' || barId.trim().length === 0) {
      throw new WsException(ErrorCodes.INVALID_BAR_ID);
    }

    void client.join(barId);
    this._logger.debug(`Cliente ${client.id} se unió a la sala del bar: ${barId}`);

    return { event: SocketEvents.joined, data: barId };
  }

  @SubscribeMessage(SocketEvents.leaveBar)
  handleLeaveBar(@ConnectedSocket() client: Socket, @MessageBody() barId: string) {
    if (!barId || typeof barId !== 'string' || barId.trim().length === 0) {
      throw new WsException(ErrorCodes.INVALID_BAR_ID);
    }

    void client.leave(barId);
    this._logger.debug(`Cliente ${client.id} abandonó la sala del bar: ${barId}`);

    return { event: SocketEvents.left, data: barId };
  }
}
