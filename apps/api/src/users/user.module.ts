import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UserRepository } from './data-access/user.repository';
import { UsersController } from './controllers/users.controller';
import { CommandHandlers } from './commands';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  providers: [UserRepository, ...CommandHandlers, ...QueryHandlers],
  controllers: [UsersController],
})
export class UserModule {}
