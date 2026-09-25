import type { EstablishmentId } from '@coaster/common';
import { DbOrderStatus, DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';
import { CASH_CLOSE_ORDER_FIELDS, CASH_CLOSE_RELATIONS, FINISHED_ORDER_STATUSES } from './cash-close-relations';

const HISTORY_SIZE = 60;

@Injectable()
export class CashClosesReadRepository {
  constructor(private readonly _db: DbService) {}

  public async findRecent(establishmentId: EstablishmentId) {
    return this._db.dbCashClose.findMany({
      where: { establishmentId },
      orderBy: { closedAt: 'desc' },
      take: HISTORY_SIZE,
      include: CASH_CLOSE_RELATIONS,
    });
  }

  public async findLast(establishmentId: EstablishmentId) {
    return this._db.dbCashClose.findFirst({
      where: { establishmentId },
      orderBy: { closedAt: 'desc' },
      select: { closedAt: true, openingFloat: true },
    });
  }

  public async findUnclosedOrders(establishmentId: EstablishmentId) {
    return this._db.dbOrder.findMany({
      where: { establishmentId, cashCloseId: null, status: { in: FINISHED_ORDER_STATUSES } },
      select: CASH_CLOSE_ORDER_FIELDS,
    });
  }

  public async findOpenOrdersCharges(establishmentId: EstablishmentId) {
    return this._db.dbOrder.findMany({
      where: { establishmentId, status: DbOrderStatus.OPEN },
      select: { amountPaidCash: true, amountPaidCard: true },
    });
  }
}
