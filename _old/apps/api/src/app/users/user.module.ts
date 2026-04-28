import { Module } from '@nestjs/common';
import { UserRepository } from './data-access/user.repository';
import { UserService } from './services/user.service';
import { UsersController } from './controllers/users.controller';

@Module({
  providers: [UserRepository, UserService],
  controllers: [UsersController],
})
export class UserModule {}
