import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { EnqueuePrintJobResponseDto, PrintJobDto, PrintTicketPayloadDto } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PrinterRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    print: (establishmentId: string) => `/establishments/${establishmentId}/printer/jobs`,
    job: (establishmentId: string, jobId: string) => `/establishments/${establishmentId}/printer/jobs/${jobId}`,
    status: (establishmentId: string) => `/establishments/${establishmentId}/printer/status`,
    deviceKey: (establishmentId: string) => `/establishments/${establishmentId}/printer/device-key`,
  };

  public async printTicket(
    establishmentId: string,
    payload: PrintTicketPayloadDto,
  ): Promise<EnqueuePrintJobResponseDto> {
    return firstValueFrom(this.#http.post<EnqueuePrintJobResponseDto>(this.routes.print(establishmentId), payload));
  }

  public async getJob(establishmentId: string, jobId: string): Promise<PrintJobDto> {
    return firstValueFrom(this.#http.get<PrintJobDto>(this.routes.job(establishmentId, jobId)));
  }

  public async generateDeviceKey(establishmentId: string): Promise<{ deviceKey: string }> {
    return firstValueFrom(this.#http.post<{ deviceKey: string }>(this.routes.deviceKey(establishmentId), {}));
  }
}
