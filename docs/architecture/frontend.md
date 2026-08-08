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

### Dominios — `bars/`, `bar-members/`, `bar-subscription/`, `admin/`, `orders/`, ...

Los dominios espejan los modulos del backend (`apps/api/src`), de forma que un `bar-subscription`
del front se corresponde con el `bar-subscription` de la API. Cada dominio agrupa todo lo suyo:
`data-access/` (repositorios HTTP), `store/` (estado con signals), `services/`, `mappers/` y, si
aplica, `guards/`, `directives/` y `dialogs/`.

El reparto alrededor de un bar es:

| Dominio            | Contiene                                                                   |
| ------------------ | -------------------------------------------------------------------------- |
| `bars`             | alta y listado de bares, bar actual                                        |
| `bar-members`      | miembros, invitaciones, mi pertenencia y `permissionGuard`                 |
| `bar-subscription` | suscripcion, checkout, portal de cliente, dialogo de planes y su directiva |
| `admin`            | backoffice de plataforma (bares, usuarios, metricas, auditoria) y `adminGuard` |
| `time-tracking`    | fichaje: jornada propia, registro del equipo, correcciones y export        |

`permissionGuard` vive en `bar-members` (no en `bars`) porque depende de `MyMemberStore`; si
estuviera en `bars` se formaria un ciclo `bars -> bar-members -> bars`.

Un dominio puede importar `@coaster/core` y otros dominios por su alias. **No puede importar de
`presentation/`**: si un servicio de dominio abre un dialogo, el componente de ese dialogo vive
en el propio dominio (ver `bar-subscription/dialogs/select-plan-dialog/`).

Cada dominio expone su API publica en su `index.ts` y se consume por alias (`@coaster/bars`),
nunca con rutas relativas que crucen carpetas.

#### Stores

Un store **nunca inyecta otro store**. Los que dependen de un bar guardan la id en un signal
propio y la exponen con `setBarId()`:

```ts
readonly #currentBarId = signal<BarId | undefined>(undefined);
readonly #resource = httpResource(() => this.#service.execute(this.#currentBarId()), { parse });
public readonly currentBarId = this.#currentBarId.asReadonly();
public setBarId(barId: BarId | undefined) { this.#currentBarId.set(barId); }
```

Quien decide cual es el bar activo es la capa de presentacion:
`presentation/bars/workspace/layouts/workspace-layout.ts` tiene un `effect` que reparte la id a
todos los stores del workspace y la limpia en el `cleanup`. `permissionGuard` hace lo propio con
`MyMemberStore` antes de que exista el layout.

Encadenar stores creaba acoplamiento invisible (un store dejaba de cargar si otro no se habia
inicializado) y ciclos entre dominios.

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

`apps/web/tsconfig.json` es un _solution config_: tiene `"files": []` y solo referencias. Por
eso `tsc -p tsconfig.json` **no comprueba nada**. Para validar tipos de verdad:

```bash
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.spec.json
```

## Alias

Los alias `@coaster/*` se declaran **solo** en `tsconfig.json`. `vitest.config.ts` los lee de ahi
en tiempo de arranque, asi que no hay que mantener dos listas: al anadir un dominio basta con
declarar su path y crear su `index.ts`.

Dos ausencias son deliberadas:

- **`presentation` no tiene alias.** Es la capa mas alta: nadie debe importar de ella. No darle
  alias es la forma mas simple de que no ocurra.
- **`@coaster/env`** apunta a `src/environments/environment.ts`, no a un `index.ts`, porque no es
  un dominio sino la configuracion que el build sustituye por entorno.

Las reglas de lint se generan leyendo las carpetas de `src/app`, asi que un dominio nuevo queda
cubierto sin tocar `eslint.config.js`.

## Bundle

El presupuesto de `initial` esta en 880 kB de aviso y 1 MB de error, no en los 500 kB por defecto
de Angular. El suelo del framework ya son ~600 kB (Angular core y router, CDK y Material, Firebase
Auth) y el codigo propio son ~27 kB. El valor esta puesto para que una regresion real salte, no
para silenciar el aviso.

Dos cosas se cargan de forma diferida a proposito:

- `provideNativeDateAdapter()` se declara en las rutas que usan datepicker (historial y cuadrante),
  no en `app.config.ts`.
- `PAYWALL_HANDLER` resuelve `PlanDialogService` con un `import()` dinamico, para que el dialogo de
  planes y `MatDialog` no entren en el bundle inicial.

`@coaster/common` se publica en doble formato (CommonJS para la API, ESM para el bundler) mediante
el mapa `exports` de su `package.json`. Si solo emitiera CommonJS, Angular avisa de que no puede
optimizar el modulo.

**Al tocar `packages/common` hay que reconstruirlo y reiniciar la API**, porque las dos aplicaciones
consumen su `dist`, no su codigo fuente:

```bash
npm run build -w @coaster/common && docker restart coaster-api-1
```

Nadie vigila ese paquete en desarrollo: el contenedor de la API monta el repo pero arranca
`nest start -b swc -w`, que solo mira `apps/api/src`. Sin reconstruir, la API sigue con la version
anterior en su cache de modulos; sin reiniciar, tampoco la recarga. El sintoma es raro y despista:
lo que se anadio al paquete llega como `undefined` y revienta lejos de donde estaba el cambio.
