import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { UsersController } from './controllers/users.controller';
import { UserRepository } from './data-access/user.repository';
import { QueryHandlers } from './queries';
import { UserSagas } from './sagas/user.sagas';

@Module({
  imports: [CqrsModule],
  providers: [UserRepository, ...CommandHandlers, ...QueryHandlers, UserSagas],
  controllers: [UsersController],
})
export class UserModule {}
