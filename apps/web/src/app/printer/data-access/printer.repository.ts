import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { EnqueuePrintJobResponseDto, PrinterStatusDto, PrintJobDto, PrintTicketPayloadDto } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PrinterRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    print: (barId: string) => `/bars/${barId}/printer/jobs`,
    job: (barId: string, jobId: string) => `/bars/${barId}/printer/jobs/${jobId}`,
    status: (barId: string) => `/bars/${barId}/printer/status`,
    deviceKey: (barId: string) => `/bars/${barId}/printer/device-key`,
  };

  public async printTicket(barId: string, payload: PrintTicketPayloadDto): Promise<EnqueuePrintJobResponseDto> {
    return firstValueFrom(this.#http.post<EnqueuePrintJobResponseDto>(this.routes.print(barId), payload));
  }

  public async getJob(barId: string, jobId: string): Promise<PrintJobDto> {
    return firstValueFrom(this.#http.get<PrintJobDto>(this.routes.job(barId, jobId)));
  }

  public async getStatus(barId: string): Promise<PrinterStatusDto> {
    return firstValueFrom(this.#http.get<PrinterStatusDto>(this.routes.status(barId)));
  }

  public async generateDeviceKey(barId: string): Promise<{ deviceKey: string }> {
    return firstValueFrom(this.#http.post<{ deviceKey: string }>(this.routes.deviceKey(barId), {}));
  }
}
