import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { MenuController } from './controllers/menu.controller';
import { PublicMenuController } from './controllers/public-menu.controller';
import { MenuRepository } from './data-access/menu.repository';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [MenuController, PublicMenuController],
  providers: [MenuRepository, ...CommandHandlers, ...QueryHandlers],
})
export class MenuModule {}
