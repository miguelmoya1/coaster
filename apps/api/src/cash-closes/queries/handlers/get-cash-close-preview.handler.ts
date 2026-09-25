import type { CashClosePreview } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CashClosesReadRepository } from '../../data-access/cash-closes.read.repository';
import { cashCloseTotalsOf } from '../../domain/cash-close-totals';
import { GetCashClosePreviewQuery } from '../impl/get-cash-close-preview.query';

@QueryHandler(GetCashClosePreviewQuery)
export class GetCashClosePreviewHandler implements IQueryHandler<GetCashClosePreviewQuery, CashClosePreview> {
  constructor(private readonly readRepo: CashClosesReadRepository) {}

  async execute(query: GetCashClosePreviewQuery): Promise<CashClosePreview> {
    const [last, orders, openOrders] = await Promise.all([
      this.readRepo.findLast(query.establishmentId),
      this.readRepo.findUnclosedOrders(query.establishmentId),
      this.readRepo.findOpenOrdersCharges(query.establishmentId),
    ]);

    return {
      ...cashCloseTotalsOf(orders),
      since: last?.closedAt.toISOString() ?? null,
      openOrders: openOrders.length,
      openOrdersCharged: openOrders.reduce((sum, order) => sum + order.amountPaidCash + order.amountPaidCard, 0),
      openingFloat: last?.openingFloat ?? 0,
    };
  }
}
