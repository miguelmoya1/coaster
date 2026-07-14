import { inject, Injectable } from '@angular/core';
import type { Order, OrderItem, PrintTicketItemDto, PrintTicketPayloadDto } from '@coaster/common';
import { PrinterRepository } from '../data-access/printer.repository';

@Injectable({ providedIn: 'root' })
export class PrintTicket {
  readonly #printerRepository = inject(PrinterRepository);

  public async execute(order: Order): Promise<void> {
    const payload = this.buildTicketPayload(order);
    await this.#printerRepository.printTicket(order.barId, payload);
  }

  private buildTicketPayload(order: Order): PrintTicketPayloadDto {
    const items: PrintTicketItemDto[] = order.items.map((item: OrderItem) => ({
      name: item.productName ?? `Product ${item.productId}`,
      quantity: item.quantity,
      price: this.formatPrice(item.priceAtPurchase),
      total: this.formatPrice(item.priceAtPurchase * item.quantity),
    }));

    return {
      type: 'order',
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
