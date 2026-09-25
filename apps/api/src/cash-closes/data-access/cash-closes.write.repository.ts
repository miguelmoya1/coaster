import type { CloseCashDto, EstablishmentId, UserId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';
import { cashCloseTotalsOf } from '../domain/cash-close-totals';
import { CASH_CLOSE_ORDER_FIELDS, CASH_CLOSE_RELATIONS, FINISHED_ORDER_STATUSES } from './cash-close-relations';

@Injectable()
export class CashClosesWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async close(establishmentId: EstablishmentId, closedById: UserId, dto: CloseCashDto) {
    return this._db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "Establishment" WHERE id = ${establishmentId} FOR UPDATE`;

      const previous = await tx.dbCashClose.findFirst({
        where: { establishmentId },
        orderBy: { closedAt: 'desc' },
        select: { closedAt: true },
      });

      const created = await tx.dbCashClose.create({
        data: {
          establishmentId,
          closedById,
          since: previous?.closedAt ?? null,
          openingFloat: dto.openingFloat,
          countedCash: dto.countedCash,
          notes: dto.notes?.trim().substring(0, 500) || null,
          ...cashCloseTotalsOf([]),
        },
      });

      await tx.dbOrder.updateMany({
        where: { establishmentId, cashCloseId: null, status: { in: FINISHED_ORDER_STATUSES } },
        data: { cashCloseId: created.id },
      });

      const orders = await tx.dbOrder.findMany({
        where: { cashCloseId: created.id },
        select: CASH_CLOSE_ORDER_FIELDS,
      });

      return tx.dbCashClose.update({
        where: { id: created.id },
        data: cashCloseTotalsOf(orders),
        include: CASH_CLOSE_RELATIONS,
      });
    });
  }
}
