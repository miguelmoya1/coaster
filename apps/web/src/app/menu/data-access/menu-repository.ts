import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { EstablishmentId, MenuDraft, SaveMenuDraftDto } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Service()
export class MenuRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    draft: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/menu`,
    published: (slug: string, language: string) => `/menus/${slug}?lang=${language}`,
  };

  public save(establishmentId: EstablishmentId, dto: SaveMenuDraftDto): Promise<MenuDraft> {
    return firstValueFrom(this.#http.put<MenuDraft>(this.routes.draft(establishmentId), dto));
  }

  public publish(establishmentId: EstablishmentId): Promise<void> {
    return firstValueFrom(this.#http.post<void>(`${this.routes.draft(establishmentId)}/publish`, {}));
  }

  public unpublish(establishmentId: EstablishmentId): Promise<void> {
    return firstValueFrom(this.#http.post<void>(`${this.routes.draft(establishmentId)}/unpublish`, {}));
  }
}
