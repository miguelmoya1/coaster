import { inject, Injectable } from '@angular/core';
import type { Order, OrderItem, PrintJobDto, PrintTicketItemDto, PrintTicketPayloadDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { PrinterRepository } from '../data-access/printer.repository';

const RESULT_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 700;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable({ providedIn: 'root' })
export class PrintTicket {
  readonly #printerRepository = inject(PrinterRepository);

  public async execute(order: Order, barName?: string): Promise<void> {
    const payload = this.buildTicketPayload(order, barName);
    const { jobId } = await this.#printerRepository.printTicket(order.barId, payload);

    await this.waitUntilPrinted(order.barId, jobId);
  }

  private async waitUntilPrinted(barId: string, jobId: string): Promise<void> {
    const giveUpAt = Date.now() + RESULT_TIMEOUT_MS;

    while (Date.now() < giveUpAt) {
      const job = await this.#printerRepository.getJob(barId, jobId);

      if (job.status === 'PRINTED') {
        return;
      }

      if (job.status === 'FAILED') {
        throw new Error(this.failureReason(job));
      }

      await delay(POLL_INTERVAL_MS);
    }

    throw new Error(ErrorCodes.PRINT_JOB_TIMEOUT);
  }

  private failureReason(job: PrintJobDto): string {
    return job.error ?? ErrorCodes.PRINT_JOB_FAILED;
  }

  private buildTicketPayload(order: Order, barName?: string): PrintTicketPayloadDto {
    const items: PrintTicketItemDto[] = order.items.map((item: OrderItem) => ({
      name: item.productName ?? `Product ${item.productId}`,
      quantity: item.quantity,
      price: this.formatPrice(item.priceAtPurchase),
      total: this.formatPrice(item.priceAtPurchase * item.quantity),
    }));

    return {
      type: 'order',
      barName,
      table: order.tableName ?? (order.tableId ? `Table ${order.tableId}` : 'Barra'),
      date: new Date().toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      items,
      total: this.formatPrice(order.totalAmount),
      currency: 'EUR',
      notes: order.notes ?? undefined,
    };
  }

  private formatPrice(cents: number): string {
    return (cents / 100).toFixed(2);
  }
}
