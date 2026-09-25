import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { EstablishmentId, Language, MenuDraft, PublishedMenu } from '@coaster/common';
import { MenuRepository } from '../data-access/menu-repository';

export const menuDraftResource = (establishmentId: Signal<EstablishmentId | undefined>) => {
  const repository = inject(MenuRepository);

  return httpResource<MenuDraft>(() => {
    const id = establishmentId();
    return id ? repository.routes.draft(id) : undefined;
  });
};

export const publishedMenuResource = (slug: Signal<string | undefined>, language: Signal<Language>) => {
  const repository = inject(MenuRepository);

  return httpResource<PublishedMenu>(() => {
    const menu = slug();
    return menu ? repository.routes.published(menu, language()) : undefined;
  });
};
