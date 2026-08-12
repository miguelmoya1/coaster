import type { PublishedMenu } from '@coaster/common';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Throttle, seconds } from '@nestjs/throttler';
import { GetPublishedMenuQuery } from '../queries';

@Controller('menus')
@Throttle({ default: { ttl: seconds(60), limit: 60 } })
export class PublicMenuController {
  constructor(private readonly _queryBus: QueryBus) {}

  @Get(':slug')
  async getPublishedMenu(@Param('slug') slug: string, @Query('lang') lang?: string) {
    return this._queryBus.execute<GetPublishedMenuQuery, PublishedMenu>(new GetPublishedMenuQuery(slug, lang));
  }
}
