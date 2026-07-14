import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PrinterRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    connection: (barId: string) => '/bars/' + barId + '/printer/connection',
    print: (ipAddress: string) => 'http://' + ipAddress + ':8080/print',
  };

  public async getConnection(barId: string): Promise<{ ipAddress: string; token: string }> {
    return firstValueFrom(this.#http.get<{ ipAddress: string; token: string }>(this.routes.connection(barId)));
  }

  public async sendPrintRequest(ipAddress: string, token: string, text: string): Promise<void> {
    return firstValueFrom(
      this.#http.post<void>(this.routes.print(ipAddress), text, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'text' as 'json',
      }),
    );
  }

  public async printText(barId: string, text: string): Promise<void> {
    const { ipAddress, token } = await this.getConnection(barId);
    await this.sendPrintRequest(ipAddress, token, text);
  }
}
