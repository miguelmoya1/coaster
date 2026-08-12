import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import qrcode from 'qrcode-generator';

const PRINT_SIZE = 1024;

@Component({
  selector: 'coaster-qr-code',
  template: `<div class="bg-white p-3 rounded-xl inline-block" [innerHTML]="svg()"></div>`,
})
export class QrCode {
  public readonly value = input.required<string>();
  public readonly size = input(180);

  readonly #sanitizer = inject(DomSanitizer);

  readonly #matrix = computed(() => {
    const qr = qrcode(0, 'M');
    qr.addData(this.value());
    qr.make();

    const modules = qr.getModuleCount();
    const dark: boolean[][] = [];

    for (let row = 0; row < modules; row++) {
      dark.push(Array.from({ length: modules }, (_, column) => qr.isDark(row, column)));
    }

    return { modules, dark };
  });

  protected readonly svg = computed<SafeHtml>(() => {
    const { modules, dark } = this.#matrix();
    const size = this.size();
    const cell = size / modules;
    const path: string[] = [];

    for (let row = 0; row < modules; row++) {
      for (let column = 0; column < modules; column++) {
        if (dark[row][column]) {
          path.push(`M${column * cell} ${row * cell}h${cell}v${cell}h${-cell}z`);
        }
      }
    }

    return this.#sanitizer.bypassSecurityTrustHtml(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img">` +
        `<path fill="#000" d="${path.join('')}"/></svg>`,
    );
  });

  public toPngDataUrl(): string {
    const { modules, dark } = this.#matrix();
    const quiet = 4;
    const cell = Math.floor(PRINT_SIZE / (modules + quiet * 2));
    const side = cell * (modules + quiet * 2);

    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;

    const context = canvas.getContext('2d');

    if (!context) {
      return '';
    }

    context.fillStyle = '#fff';
    context.fillRect(0, 0, side, side);
    context.fillStyle = '#000';

    for (let row = 0; row < modules; row++) {
      for (let column = 0; column < modules; column++) {
        if (dark[row][column]) {
          context.fillRect((column + quiet) * cell, (row + quiet) * cell, cell, cell);
        }
      }
    }

    return canvas.toDataURL('image/png');
  }
}
