# Arquitectura del backend (NestJS)

## Modulos y su API publica

Cada carpeta de `apps/api/src` es un modulo y expone su **API publica** en su `index.ts`. Lo que
no esta en el `index.ts` es interno: repositorios, handlers, DTOs y utilidades no se importan
desde fuera.

Los `index.ts` re-exportan directamente desde el fichero que declara cada simbolo
(`export { CreateOrderCommand } from './commands/impl/create-order.command';`) en lugar de
re-exportar el barril `./commands`. Asi el grafo de carga no arrastra los handlers, que son los
que tienen dependencias y los que provocan ciclos en tiempo de `require`.

## Alias

Un alias por modulo, declarado **solo** en `tsconfig.json`:

```text
@coaster/<modulo>   ->  ./src/<modulo>/index.ts
@coaster/core/db    ->  ./src/core/db/index.ts
```

`core/db` tiene entrada propia porque es la capa de persistencia (cliente Prisma generado) y no
debe viajar dentro del barril general de `core`.

No hay alias comodin (`@bars/*`). Eran una via para saltarse el `index.ts` e importar interioridades
de otro modulo.

Regla: **cruzar de modulo se hace por el alias; dentro del modulo, ruta relativa.**

## Capas

`core` es la capa base y **no puede importar ningun modulo de negocio**; el lint lo impide. Si
`core` necesita algo de arriba, se invierte la dependencia con un puerto: ver
`StripeWebhookDispatcher`, donde `stripe` define la interfaz y `bar-subscription` se registra.

## Como se protege

`apps/api/eslint.config.mjs` genera las reglas leyendo los directorios de `src`, de modo que un
modulo nuevo queda cubierto sin tocar la configuracion:

- error si un fichero de `core/` importa un modulo de negocio;
- aviso si un fichero cruza a otro modulo con ruta relativa en vez de `@coaster/<modulo>`.

El segundo esta en `warn` mientras quedan imports relativos heredados por migrar. Cuando se
completen, pasa a `error`.

## Runtime

Los alias de TypeScript son de compilacion. El builder SWC de Nest los resuelve al construir: en
`dist` no queda ningun `require("@coaster/...")` sin resolver, asi que `node dist/main` funciona
sin `tsconfig-paths` ni ningun cargador extra.

## Tests

`vitest.config.ts` lee los `paths` de `tsconfig.json` y construye sus alias a partir de ahi. No
hay una segunda lista que mantener sincronizada.
