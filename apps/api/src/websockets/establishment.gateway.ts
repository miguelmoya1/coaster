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
export class EstablishmentGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  declare server: Server;

  private readonly _logger = new Logger(EstablishmentGateway.name);

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

  @SubscribeMessage(SocketEvents.joinEstablishment)
  async handleJoinEstablishment(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() establishmentId: string,
  ) {
    if (!establishmentId || typeof establishmentId !== 'string' || establishmentId.trim().length === 0) {
      throw new WsException(ErrorCodes.INVALID_ESTABLISHMENT_ID);
    }

    const userId = client.data.userId;

    if (!userId) {
      throw new WsException(ErrorCodes.UNAUTHORIZED);
    }

    const canAccess = await this._wsAuth.canAccessEstablishment(userId, establishmentId);

    if (!canAccess) {
      this._logger.warn(`Usuario ${userId} intentó unirse al establishment ${establishmentId} sin pertenecer a él`);
      throw new WsException(ErrorCodes.UNAUTHORIZED);
    }

    await client.join(establishmentId);
    this._logger.debug(`Cliente ${client.id} se unió a la sala del establishment: ${establishmentId}`);

    return { event: SocketEvents.joined, data: establishmentId };
  }

  async evictFromEstablishment(establishmentId: string, userId: string) {
    const sockets = await this.#socketsIn(establishmentId);

    for (const socket of sockets) {
      if ((socket.data as { userId?: string }).userId === userId) {
        await socket.leave(establishmentId);
        this._logger.debug(
          `Usuario ${userId} sacado de la sala del establishment ${establishmentId} tras perder el acceso`,
        );
      }
    }
  }

  async #socketsIn(establishmentId: string) {
    try {
      return await this.server.in(establishmentId).fetchSockets();
    } catch (error) {
      this._logger.warn(
        `No se pudo consultar al resto de instancias por la sala ${establishmentId} (${(error as Error).message}); ` +
          'se expulsa solo a los sockets de esta',
      );

      return this.server.in(establishmentId).local.fetchSockets();
    }
  }

  @SubscribeMessage(SocketEvents.leaveEstablishment)
  async handleLeaveEstablishment(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() establishmentId: string,
  ) {
    if (!establishmentId || typeof establishmentId !== 'string' || establishmentId.trim().length === 0) {
      throw new WsException(ErrorCodes.INVALID_ESTABLISHMENT_ID);
    }

    await client.leave(establishmentId);
    this._logger.debug(`Cliente ${client.id} abandonó la sala del establishment: ${establishmentId}`);

    return { event: SocketEvents.left, data: establishmentId };
  }
}
