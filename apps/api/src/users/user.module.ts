import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { UsersController } from './controllers/users.controller';
import { UserReadRepository } from './data-access/user.read.repository';
import { UserWriteRepository } from './data-access/user.write.repository';
import { QueryHandlers } from './queries';
import { UserSagas } from './sagas/user.sagas';

@Module({
  imports: [CqrsModule],
  providers: [UserReadRepository, UserWriteRepository, ...CommandHandlers, ...QueryHandlers, UserSagas],
  controllers: [UsersController],
})
export class UserModule {}
