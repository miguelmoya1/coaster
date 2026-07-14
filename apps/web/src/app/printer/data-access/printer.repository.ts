import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { PrinterConnectionDetailsDto, PrinterStatusDto, PrintTicketPayloadDto } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PrinterRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    connection: (barId: string) => `/bars/${barId}/printer/connection`,
    status: (barId: string) => `/bars/${barId}/printer/status`,
    deviceKey: (barId: string) => `/bars/${barId}/printer/device-key`,
    print: (ipAddress: string, port: number) => `http://${ipAddress}:${port}/print`,
  };

  public async getConnection(barId: string): Promise<PrinterConnectionDetailsDto> {
    return firstValueFrom(this.#http.get<PrinterConnectionDetailsDto>(this.routes.connection(barId)));
  }

  public async getStatus(barId: string): Promise<PrinterStatusDto> {
    return firstValueFrom(this.#http.get<PrinterStatusDto>(this.routes.status(barId)));
  }

  public async generateDeviceKey(barId: string): Promise<{ deviceKey: string }> {
    return firstValueFrom(this.#http.post<{ deviceKey: string }>(this.routes.deviceKey(barId), {}));
  }

  public async sendPrintRequest(ipAddress: string, port: number, token: string, payload: PrintTicketPayloadDto) {
    return firstValueFrom(
      this.#http.post<void>(this.routes.print(ipAddress, port), payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }),
    );
  }

  public async printTicket(barId: string, payload: PrintTicketPayloadDto): Promise<void> {
    const { ipAddress, port, token } = await this.getConnection(barId);
    await this.sendPrintRequest(ipAddress, port, token, payload);
  }
}
