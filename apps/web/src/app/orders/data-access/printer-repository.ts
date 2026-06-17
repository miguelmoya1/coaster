import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@coaster/env';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PrinterRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    print: () => `${environment.printerUrl}/print`,
  };

  public async printText(text: string): Promise<void> {
    return firstValueFrom(
      this.#http.post<void>(this.routes.print(), text, { responseType: 'text' as 'json' })
    );
  }
}
