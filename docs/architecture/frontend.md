# Arquitectura del frontend (Angular)

## Capas

El codigo de `apps/web/src/app` esta dividido en tres capas. Las dependencias van **siempre en
una direccion**:

```text
core  <--  dominios  <--  presentation
```

### `core/` — capa base

Infraestructura transversal: utilidades, mappers, errores, servicios de sesion (`Auth`,
`Socket`, `Toast`), guards genericos e interceptores HTTP.

No conoce ningun dominio ni ninguna pantalla. **No puede importar `@coaster/<dominio>` ni nada de
`presentation/`.** Un import asi rompe el lint.

Cuando `core` necesita comportamiento que vive mas arriba, se invierte la dependencia con un
`InjectionToken`. Ejemplo real: `errorInterceptor` abre el dialogo de planes al recibir un 402,
pero no conoce `PlanDialogService`; depende de `PAYWALL_HANDLER`, que `app.config.ts` resuelve
con `useExisting: PlanDialogService`.

### Dominios — `bars/`, `orders/`, `products/`, `tables/`, ...

Cada dominio agrupa todo lo suyo: `data-access/` (repositorios HTTP), `store/` (estado con
signals), `services/`, `mappers/` y, si aplica, `guards/`, `directives/` y `dialogs/`.

Un dominio puede importar `@coaster/core` y otros dominios por su alias. **No puede importar de
`presentation/`**: si un servicio de dominio abre un dialogo, el componente de ese dialogo vive
en el propio dominio (ver `bars/dialogs/select-plan-dialog/`).

Cada dominio expone su API publica en su `index.ts` y se consume por alias (`@coaster/bars`),
nunca con rutas relativas que crucen carpetas.

### `presentation/` — capa de pantallas

Componentes, paginas, layouts y ficheros de rutas. Puede importar de todo lo anterior. Nadie
importa de `presentation/`.

## Por que importa

Cuando `core` dependia de `bars`, cualquier fichero de `bars` que quisiera algo de `core` tenia
que esquivar el barril con rutas relativas (`../../core/...`) para no crear un ciclo. El
resultado era que importar una utilidad hoja arrastraba guards, stores y repositorios HTTP
enteros. Al cortar esa dependencia, los alias funcionan en todas partes y el grafo es aciclico.

## Como se protege

`apps/web/eslint.config.js` incluye reglas `no-restricted-imports` que fallan el lint si:

- un fichero de `core/` importa un dominio o `presentation/`;
- un fichero de dominio importa `presentation/`;
- un fichero de dominio cruza a otra carpeta con ruta relativa en vez de usar el alias.

## Typecheck

`apps/web/tsconfig.json` es un *solution config*: tiene `"files": []` y solo referencias. Por
eso `tsc -p tsconfig.json` **no comprueba nada**. Para validar tipos de verdad:

```bash
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.spec.json
```
