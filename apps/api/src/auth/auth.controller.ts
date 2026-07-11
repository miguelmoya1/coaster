import { Controller, Post, Headers, UnauthorizedException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ErrorCodes } from '@coaster/common';
import { DbUser } from '../core/db';
import { SyncUserCommand } from './commands/impl/sync-user.command';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('login')
  @ApiOperation({ summary: 'Synchronizes and logs in the user using the Firebase token' })
  @ApiHeader({ name: 'Authorization', description: 'Bearer <firebase_token>' })
  @ApiResponse({ status: 200, description: 'User synchronized successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or missing token' })
  async login(@Headers('authorization') authHeader: string): Promise<DbUser> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(ErrorCodes.UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];
    
    return this.commandBus.execute(new SyncUserCommand(token));
  }
}
