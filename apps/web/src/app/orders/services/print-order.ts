import { inject, Injectable } from '@angular/core';
import { PrinterRepository } from '../data-access/printer-repository';
import type { Order, OrderItem } from '@coaster/common';

@Injectable({ providedIn: 'root' })
export class PrintOrder {
  readonly #printerRepository = inject(PrinterRepository);

  public async execute(order: Order): Promise<void> {
    const date = new Date().toLocaleString();
    let text = `--------------------------------\n`;
    text += `          TABLE TICKET          \n`;
    text += `--------------------------------\n`;
    text += `Table: ${order.tableId ? order.tableId : 'Bar'}\n`;
    text += `Date: ${date}\n`;
    text += `--------------------------------\n`;
    
    order.items.forEach((item: OrderItem) => {
      text += `${item.quantity}x ${item.productName ?? item.productId}\n`;
      text += `    ${(item.priceAtPurchase * item.quantity).toFixed(2)} EUR\n`;
    });
    
    text += `--------------------------------\n`;
    text += `TOTAL: ${order.totalAmount.toFixed(2)} EUR\n`;
    text += `--------------------------------\n\n\n`;

    await this.#printerRepository.printText(text);
  }
}
