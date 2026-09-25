import { computed, type Resource, type Signal, type WritableResource } from '@angular/core';
import { nonBlocking, type ActivatedRouteSnapshot, type ResourceContext, type ResourceResult } from '@angular/router';
import { asEstablishmentId, type EstablishmentId } from '@coaster/common';

export type PageResource<T> = Resource<T | undefined> & Pick<WritableResource<T | undefined>, 'reload'>;

export const nonBlockingResources =
  <R extends ResourceResult>(factory: (context: ResourceContext) => R) =>
  (context: ResourceContext): R =>
    Object.fromEntries(Object.entries(factory(context)).map(([key, resource]) => [key, nonBlocking(resource)])) as R;

export const routeParam = <T extends string = string>(context: ResourceContext, name: string): Signal<T | undefined> =>
  computed(() => context.params()[name] as T | undefined);

export const queryParam = (context: ResourceContext, name: string): Signal<string | undefined> =>
  computed(() => context.queryParams()[name] as string | undefined);

export const establishmentIdOf = (context: ResourceContext): Signal<EstablishmentId | undefined> =>
  routeParam<EstablishmentId>(context, 'establishmentId');

export const establishmentIdIn = (route: ActivatedRouteSnapshot): EstablishmentId | undefined => {
  for (let current: ActivatedRouteSnapshot | null = route; current; current = current.parent) {
    const establishmentId = current.paramMap.get('establishmentId');

    if (establishmentId) {
      return asEstablishmentId(establishmentId);
    }
  }

  return undefined;
};

export const loadedOr = <T>(resource: PageResource<T>, fallback: T): T =>
  resource.hasValue() ? (resource.value() ?? fallback) : fallback;
