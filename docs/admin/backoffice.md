# Backoffice de administracion

Panel interno en `/admin`, solo para usuarios con `User.role = ADMIN`. Sirve para operar la
plataforma sin entrar en la base de datos a mano.

El control de acceso completo esta en [Modelo de acceso](../architecture/permissions.md).

## Secciones

| Ruta               | Para que                                                                     |
| ------------------ | ---------------------------------------------------------------------------- |
| `/admin/overview`  | Bares, usuarios, cuantos tienen acceso y por que via, facturacion a 30 dias   |
| `/admin/bars`      | Listado con busqueda y filtros; ficha con acciones sobre el plan y el equipo  |
| `/admin/users`     | Buscar personas, promover o quitar admin, activar y desactivar                |
| `/admin/audit`     | Todo lo que se ha hecho desde el panel                                        |
| `/admin/templates` | Plantillas estandar de catalogo que se ofrecen al crear un bar                |

## Conceder PRO sin Stripe

Desde la ficha de un bar: **Conceder PRO**, con duracion (7, 30, 90, 365 dias o indefinido) y un
motivo opcional.

Se escribe en las columnas `manual*` de `BarSubscription` sin tocar las de Stripe. Consecuencias:

- El bar escribe con normalidad aunque no tenga suscripcion ni cliente en Stripe.
- Un webhook posterior actualiza la facturacion sin borrar la concesion.
- Al retirarla, el bar vuelve a lo que diga Stripe; si ahi no hay nada vivo, queda en solo lectura.
- Una concesion caducada equivale a no tener ninguna: no hace falta limpiarla.

Retirar exige que haya una concesion; si no la hay responde `NO_MANUAL_GRANT` en vez de fingir
exito sobre una suscripcion de Stripe que el panel no gestiona.

Conceder y retirar publican `SubscriptionOverriddenEvent`, que sale por websocket como
`subscriptionUpdated`, de modo que los clientes de ese bar se refrescan al instante.

## Origen de facturacion

Cada bar se clasifica en uno de tres estados, excluyentes y en este orden de prioridad:

- **MANUAL** — concesion de admin vigente.
- **STRIPE** — suscripcion de Stripe viva y sin concesion por encima.
- **NONE** — ni una cosa ni la otra: el bar esta en solo lectura.

El calculo (`AdminMapper`) replica el de `SubscriptionActiveGuard` a proposito, para que el panel
nunca muestre acceso que la API vaya a rechazar.

## Reglas que el panel no deja saltarse

- No puedes editar tu propia cuenta de admin: surtiria efecto en la peticion siguiente y no
  quedaria pantalla desde la que deshacerlo.
- No puedes quitar ni desactivar al ultimo admin activo.
- No puedes dejar un bar sin `OWNER`.
- Las acciones destructivas (borrar bares o usuarios) no existen todavia, por decision explicita.

## Auditoria

Cada accion escribe en `AdminAuditLog` el actor, la accion, el objetivo, el motivo y un `metadata`
con el antes y el despues. Se ve en `/admin/audit` y, filtrado, en la ficha de cada bar y usuario.

Acciones registradas: `BAR_PLAN_GRANTED`, `BAR_PLAN_REVOKED`, `BAR_RENAMED`,
`BAR_MEMBER_ROLE_CHANGED`, `USER_ROLE_CHANGED`, `USER_ACTIVATION_CHANGED`.

### Como se registra

Ningun handler escribe en el repositorio de auditoria. Todos publican **un unico evento**,
`AdminActionEvent`, que lleva la entrada ya montada; `RecordAdminActionHandler` es el unico
suscriptor y el unico que escribe.

```text
handler de comando ─┐
                    ├─► AdminActionEvent ─► RecordAdminActionHandler ─► AdminAuditLog
MemberRoleChangedEvent (si el actor es ADMIN) ─┘
```

Un evento por accion habria significado seis handlers identicos: la entrada de auditoria ya tiene
la misma forma para todas, asi que el evento la transporta tal cual.

Dos consecuencias que conviene tener presentes:

- El registro es **asincrono**. Ya lo era de facto (la escritura nunca compartio transaccion con la
  accion), pero ahora un fallo del handler no revienta la peticion: se registra como `error` en el
  log con el detalle de que accion quedo sin auditar.
- `BAR_MEMBER_ROLE_CHANGED` no nace de una ruta del backoffice. El panel cambia roles con el mismo
  `PATCH /bars/:barId/members/:memberId` que usa un dueno, y la entrada se escribe solo cuando quien
  actua es `ADMIN`.

## Estructura del codigo

Sigue el mismo reparto que el resto (ver [backend](../architecture/backend.md) y
[frontend](../architecture/frontend.md)):

```text
apps/api/src/admin/          modulo CQRS: controllers, commands, queries, data-access, dto
apps/web/src/app/admin/      dominio: repositorio HTTP, stores con signals, mappers
apps/web/src/app/presentation/admin/   layout, paginas y componentes
```

La API expone todo bajo `/api/v1/admin`. Las rutas de bares llevan `@SkipSubscriptionCheck()`:
tienen `barId`, y sin el, el guard global bloquearia las escrituras justo sobre los bares
caducados que el admin viene a arreglar.
