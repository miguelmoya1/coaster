import { inject, Injectable } from '@angular/core';
import { PrinterRepository } from '../data-access/printer-repository';
import type { Order } from '@coaster/common';

@Injectable({ providedIn: 'root' })
export class PrintOrder {
  readonly #printerRepository = inject(PrinterRepository);

  public async execute(order: Order): Promise<void> {
    const date = new Date().toLocaleString();
    let text = `--------------------------------\n`;
    text += `         TICKET DE MESA         \n`;
    text += `--------------------------------\n`;
    text += `Mesa: ${order.tableId ? order.tableId : 'Barra'}\n`;
    text += `Fecha: ${date}\n`;
    text += `--------------------------------\n`;
    
    order.items.forEach((item: any) => {
      text += `${item.quantity}x ${item.productName ?? item.productId}\n`;
      text += `    ${(item.priceAtPurchase * item.quantity).toFixed(2)} EUR\n`;
    });
    
    text += `--------------------------------\n`;
    text += `TOTAL: ${order.totalAmount.toFixed(2)} EUR\n`;
    text += `--------------------------------\n\n\n`;

    await this.#printerRepository.printText(text);
  }
}
