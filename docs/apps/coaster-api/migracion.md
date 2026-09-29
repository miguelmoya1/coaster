# Migración de `apps/api` (NestJS) a `apps/coaster-api`

Por qué y cómo se reescribe la API de coaster en Go, en qué punto está y en qué se diferencia
de Nest. Cómo se hace cada cosa está en [convenciones](convenciones.md); las carpetas, en [estructura](estructura.md).

## Objetivos

1. **Aprender Go** con un proyecto real.
2. **Ahorrar costes** en Cloud Run: menos instancias gracias a más concurrencia y al uso de
   varios núcleos, arranques en frío casi instantáneos y posibilidad de funcionar sin Redis
   mientras baste con una sola instancia.

El rendimiento **no** es el motivo. Casi toda la latencia de la API viene de Postgres.

## Decisiones tomadas

- **Sin CQRS.** Un servicio por entidad y un método por caso de uso. Los command/query
  handlers de Nest se convierten en métodos del servicio.
- **Los efectos secundarios van por eventos.** Hablamos del realtime, la auditoría y la
  invalidación de caché. Hay una interfaz `EventPublisher` en `ports/` y cada suscriptor se
  ejecuta en su goroutine. Solo se publica después de guardar en la base de datos.
- **Interfaces en `core/ports`**: repositorios, servicios externos, `EventPublisher` y
  también los servicios. Cada servicio tiene su interfaz en `ports` con su mismo nombre
  (`ports.OrderService`, `ports.AuthService`…) y los métodos que usan los handlers y
  middlewares; los handlers y middlewares reciben esas y nunca declaran interfaces en su
  archivo. `main.go` les pasa el `*service.XService` de siempre. Los inputs de los servicios
  están en `domain`.
- **Las transacciones viven dentro del repositorio**, igual que en `apps/api`, donde los 14
  archivos que usan `$transaction` son repositorios. No hay `TxManager` ni `UnitOfWork`.
- **SQL a mano, un archivo `.sql` por consulta**, incrustado con `go:embed` (ver
  [estructura](estructura.md)). Sin ORM y sin sqlc por ahora.
- **El esquema lo lleva goose desde el 29 de septiembre de 2026**, también mientras Nest sirve.
  Las 47 migraciones de Prisma están copiadas tal cual, una de goose por cada una y con la misma
  fecha como versión, en lugar de una migración base: producción va por detrás de dev, y así
  cada entorno aplica lo que le falte. En una base que migró Prisma, la primera vez que corre
  `migrate` apunta lo que Prisma ya aplicó y aplica el resto.
- **El esquema es una aplicación aparte, `apps/database`** ([database](../database.md)), con su
  imagen y su job de Cloud Run. No depende de qué API lo use, y la imagen del job no lleva la API.
- **Las migraciones se aplican en un job de Cloud Run, no al arrancar la API.** El job corre en
  cada despliegue, antes de la revisión nueva. Así varias instancias no compiten por migrar, una
  migración larga no choca con el tiempo de arranque que da Cloud Run, y volver a una revisión
  anterior no toca el esquema. El job corre `migrate` de `apps/database` aunque el servicio siga
  siendo Nest.
- **Sin log de peticiones ni ruta de salud.** Cloud Run ya registra cada petición y comprueba
  el puerto, y Nest no tiene ninguna de las dos. `slog` se usa para errores.
- **Validación casi idéntica.** Mismo formato (`message: string[]`), mismos textos y los
  campos desconocidos primero. class-validator devuelve todas las reglas que fallan en cada
  campo y validator solo la primera, así que el orden del array puede cambiar. Los e2e no
  comprueban esos textos.
- **Consultas simples.** La API actual casi no anida relaciones: son includes de un solo
  nivel, como `preferences`, `adjustments` o `items` con `product`. Cuando haga falta, se
  hacen dos consultas y se juntan en Go.
- **El código lo escribe la IA** y se revisa fase a fase.

## Cómo encaja la API actual

```
internal/
├── core/domain/        order.go, product.go, … (~20 archivos, uno por módulo de Nest)
├── core/ports/         repositorios, servicios externos y events.go
├── service/            order_service.go, …
└── adapter/
    ├── handler/httpapi/  order_handler.go, … + realtime_handler.go
    ├── handler/respond/  respuestas JSON y errores con el formato de Nest
    ├── handler/middleware/  auth, permisos, módulos, suscripción, admin, rate limit, CORS…
    ├── repository/     *_repository.go + queries/<entidad>/*.sql
    ├── cache/          Redis (caché, bus de realtime, replay, rate limit)
    ├── payment/        Stripe
    ├── email/          Resend + plantillas
    ├── storage/        GCS (URLs firmadas)
    ├── ai/             AI Gateway + herramientas
    └── nodejson/       JSON como lo escribe JSON.stringify (respuestas HTTP e IA)
```

| En Nest | En Go |
|---|---|
| Módulo (`src/orders/`) | Un archivo en cada capa: `domain/order.go`, `ports/order.go`, `service/order_service.go`, `repository/order_repository.go`, `handler/httpapi/order_handler.go` |
| Controller | Handler HTTP |
| Command/Query handler | Método del servicio |
| Event handler | Entrada de la tabla `EventHandlers()` del servicio |
| Guard | Middleware |
| DTO con class-validator | Struct con tags de `validator` |
| Repositorio de Prisma | Repositorio con pgx y archivos `.sql` |
| `core/security` | `handler/middleware/` + `service/` (tokens y sesiones) |

## Estado

Todo menos P5 está hecho desde el 28 de septiembre de 2026: Go responde las 124 rutas de Nest con
los mismos permisos, códigos y cuerpos, los 22 directorios de `apps/api/test` pasan contra él y lo
que hace distinto está en «Diferencias conocidas». Aquí solo se apunta lo que falta; lo hecho queda
en git.

## Siguiente paso

1. **Confirmar los modelos de respaldo del AI Gateway** con la clave de verdad (Miguel): cómo
   probarlo está en «IA» de [convenciones](convenciones.md).
2. **Probar argon2 con un hash real** de la base de datos de producción.
3. **Los e2e en Go** (`apps/coaster-api/e2e`), para borrar la suite de TypeScript junto con Nest.
   Hasta entonces, la de TypeScript es la prueba de que Go hace lo mismo que Nest. Faltan por pasar
   las carpetas de `apps/api/test`: `admin` y `time-tracking`.
4. **P5 Salida** (no la hacen los agentes): desplegar la imagen de Go en el servicio de Cloud Run
   de siempre (así no cambian la URL ni el webhook de Stripe), un tiempo de uso real en beta y el
   cambio en producción.

## Diferencias conocidas

Lo que Go hace distinto de Nest a propósito o porque no se ha podido copiar.

| Paquete | Diferencia | Por qué |
|---|---|---|
| P0 | El orden de `message` en los errores de validación puede cambiar | validator se para en la primera regla que falla de cada campo |
| P0 | Si un valor es del tipo equivocado (o falta), solo se devuelven esos errores y los de campos desconocidos, no los del resto de reglas | Sin el tipo correcto no se puede rellenar el struct para pasarle validator |
| P0 | Los campos desconocidos salen en orden alfabético, no en el del cuerpo | Go lee el cuerpo en un mapa, que no guarda el orden |
| P0 | No hay conversión implícita de tipos: `"5"` en un campo numérico es un error | Nest usa `enableImplicitConversion`, pero `apps/web` ya manda los tipos correctos |
| P0 | `iso8601` acepta fecha, o fecha y hora con segundos, fracción y zona opcionales; no semanas ni días del año | Es lo que manda `apps/web`, y Go no tiene la expresión regular de validator.js |
| P0 | Solo gzip, sin deflate | gzhttp solo hace gzip, y todos los navegadores lo aceptan |
| P0 | Un cuerpo que no es JSON responde 415 | Fastify acepta también `text/plain`; ningún endpoint lo usa |
| P0 | Sin Swagger en `/api/docs` | Descartado en [librerías](librerias.md); solo existía fuera de producción |
| P1 | Sin `RESEND_API_KEY` los emails de auth se escriben en el log en lugar de fallar | Resend llega en P2e; hasta entonces el flujo funciona en local y en beta |
| P1 | El contador del rate limit va por patrón de ruta e IP, no por clase y método del controlador | En Go no hay clases; como la clave es otra, Nest y Go no comparten contadores en el mismo Redis |
| P1 | Un cuerpo que no es JSON válido responde 400 después del rate limit y de los guards, no antes | Fastify lee el cuerpo antes de los guards; en Go lo lee el handler |
| P1 | El `aud` del JWT va como lista (`["coaster-api"]`) | Es como lo escribe golang-jwt; jose en Nest lo acepta igual |
| P1 | La IP sin proxy delante es `1.2.3.4` y no `::ffff:1.2.3.4` | Go no pone el prefijo IPv6 en las conexiones IPv4. En Cloud Run se lee de `X-Forwarded-For` y sale igual |
| P1 | Un token de Google vale hasta el mismo segundo de `exp` (jose lo rechaza en ese segundo) y las claves se guardan lo que diga `Cache-Control` | Lo hace `idtoken`; el emisor, `RS256` y `nbf` se comprueban a mano |
| P1 | Los atributos de la cookie salen en otro orden (`Path; Expires; HttpOnly; Secure; SameSite`) | Es el orden de `net/http`; los navegadores no lo miran |
| P2f | Un cliente tan lento que acumula 64 eventos sin leer pierde el stream (el navegador vuelve a conectar y pide lo perdido con `Last-Event-ID`) | Node guarda en memoria sin límite lo que el socket no ha enviado; en Go cada stream tiene una cola fija para que `Publish` no se bloquee |
| P2f | Los eventos perdidos (`Last-Event-ID`) se escriben antes que los que llegan mientras se leen de Redis | En Nest el replay es asíncrono y se pueden mezclar; en Go lo escribe la misma goroutine que el resto del stream |
| P2e | El webhook no mira si el cuerpo es JSON antes de comprobar la firma: un cuerpo roto responde `STRIPE_WEBHOOK_SIGNATURE_INVALID` (o el error de firma que toque) en lugar del 400/415 de Fastify | Go lee el cuerpo crudo en el handler; Stripe siempre manda JSON |
| P2e | stripe-go exige `"object":"event"` en el cuerpo del webhook; el SDK de Node no lo mira | Stripe siempre lo manda |
| P2e | Una línea de suscripción con `quantity` 0 se lee como 1 asiento (en Nest solo sin `quantity`) | stripe-go no distingue 0 de un campo ausente |
| P2e | `PRO_BASE_PRICE_CENTS`, `PRO_INCLUDED_SEATS` y `PRO_EXTRA_SEAT_PRICE_CENTS` se leen con `strconv.Atoi` (tras quitar espacios): `"5.0"` o `"1e3"` usan el valor por defecto | `Number()` de JavaScript los acepta; son variables nuestras y van como enteros |
| P2e | En los emails, `'` y `"` de los valores se escapan como `&#39;` y `&#34;`, no como `&#x27;` y `&quot;` | Es el escape de `html/template`; el navegador lo muestra igual |
| P2e | Sin `RESEND_API_KEY` los emails siguen yendo al log; Nest usa una clave falsa y el envío falla | Se mantiene lo de P1 |
| P2a | En un `PATCH`, un `null` en un campo que no admite nulos (`name`, `price`, `categoryId`, `allergens`, `taxRate` de la categoría…) se ignora; Nest lo deja pasar y Prisma responde 500. `null` en `icon`, `imageUrl` y `ownTaxRate` sí vacía la columna, igual que en Nest | Go no distingue un campo que falta de uno a `null` sin leer el cuerpo aparte; solo se hace para las columnas que admiten nulos |
| P2a | Un número con decimales en un campo entero (`price`, `currentStock`, `taxRate`…) responde 400 `INVALID_TYPE`; en Nest pasa `@IsNumber` y Prisma responde 500 | Los campos son `int` en Go |
| P2a | El slug de la carta quita los acentos con una tabla de las letras latinas (U+00C0–U+017F) y no con la normalización NFD | `golang.org/x/text` no está en [librerías](librerias.md); en ese rango da lo mismo que Node (comprobado letra a letra) y fuera de él la letra se cambia por `-` |
| P2a | El nombre y la descripción de una línea de la carta se cortan a 80 y 300 caracteres, no unidades UTF-16 | Solo cambia con emojis y otros caracteres fuera del plano básico |
| P2a | Las claves del JSON de la carta publicada salen en el orden del struct, no en el de `jsonb` | Nest devuelve el objeto tal como lo guarda Postgres; el contenido es el mismo |
| P2c | Las fechas de texto (`startDate`/`endDate` de `GET /shifts`, `occurredAt` de los fichajes) se leen solo en las formas ISO 8601: fecha, o fecha y hora con o sin zona (sin zona es UTC) | `new Date()` de JS acepta además formatos como `Sep 27 2026`; `apps/web` manda ISO |
| P2c | `startTime`/`endTime` de un turno que no son texto responden `message: ["INVALID_DATE"]` (validación) en lugar de `message: "INVALID_DATE"` | En Nest el `Transform` deja pasar el valor y lo rechaza el handler; en Go el tipo se comprueba al leer el cuerpo. Mismo 400 y mismo código |
| P2c | `latitude`/`longitude` como texto (`"40.4"`) responden 400 `INVALID_TYPE` | `@IsLatitude` acepta texto, pero luego Prisma falla con un 500 al guardarlo en un `Float` |
| P2c | En la hoja de horas, los días de la misma fecha se ordenan por nombre sin distinguir mayúsculas, no con `localeCompare` | Go no tiene la collation de ICU sin `golang.org/x/text`; solo cambia el orden con acentos (`Álvaro` va después de `Zoe`) |
| P2c | `reason` cuenta caracteres (runas) para `min=5`/`max=500`, no unidades UTF-16 | Es lo que hace validator; solo cambia con emojis y otros caracteres fuera del plano básico |
| P2b-1 | En `PATCH /users/me`, `name: null` se ignora; Nest lo deja pasar y Prisma responde 500. `photoUrl: null` vacía la foto, igual que en Nest | Como en P2a: solo se lee el `null` de las columnas que lo admiten |
| P2b-1 | El nombre de un local cuenta caracteres (runas) para `min=3`/`max=50`, no unidades UTF-16 | Es lo que hace validator; solo cambia con emojis y otros caracteres fuera del plano básico |
| P2b-1 | Un elemento de `modules` que no es texto (`{"modules":[1]}`) responde `each value in modules must be a string` en lugar de `INVALID_TYPE` | Mismo 400. El texto para un tipo equivocado es uno por campo: con `INVALID_TYPE`, un `modules` que falta dejaría de responder `modules must be an array`, que es el primer mensaje de Nest y el que enseña `apps/web` |
| P2b-2 | Invitar guarda el usuario y el miembro antes de responder y en una transacción: cuando llega el 201 el invitado ya está en la lista, y un fallo al guardar (por ejemplo, un local que no existe, que solo puede pedir un admin de la plataforma) responde 500 sin dejar nada a medias | En Nest `InviteMemberCommand` solo publica un evento y la cadena de sagas (usuario y después miembro) corre después del 201: un fallo queda en el log y puede dejar el usuario creado sin miembro. Por eso los e2e esperan con `waitForMembers` |
| P2d-3 | Las notas de un cierre de caja se cortan a 500 caracteres (runas), no a 500 unidades UTF-16: Nest valida 500 caracteres y luego guarda `substring(0, 500)`, así que con emojis guarda menos de lo que dejó pasar | Solo cambia con emojis y otros caracteres fuera del plano básico |
| P2d-2 | El token de `GET printer/connection` lleva los claims en el orden `establishmentId`, `exp`, `iat` (Nest: `establishmentId`, `iat`, `exp`) | Es el orden en que golang-jwt escribe `RegisteredClaims`; el puente lee los mismos claims y la misma firma HS256 |
| P2d-2 | `GET printer/jobs/next` deja de esperar si el puente cuelga o si el servidor se apaga (responde 204). Nest sigue mirando la cola los 25 s y puede reclamar un trabajo para una conexión cerrada, que se queda `PRINTING` hasta que vuelve a la cola a los 2 min | Así el apagado no espera 25 s por cada puente conectado y no se pierden tickets en conexiones muertas |
| P2d-2 | Un `null` en un campo opcional del ticket (`POST .../printer/jobs`) no se guarda: el puente recibe el ticket sin esa clave en lugar de con `"clave": null` | El ticket se guarda desde un struct con `omitempty`; el puente trata igual un `null` y una clave que falta, y `apps/web` no manda `null` |
| P2d-2 | `type` (`POST .../printer/jobs`) y `status` (`printer/jobs/{jobId}/result`) que faltan o no son texto responden `must be a string` en lugar de `must be one of the following values: …` | El texto de un valor que falta o es de otro tipo sale del tipo (P0), y la etiqueta `msg` no admite comas |
| P2d-2 | El motivo de un fallo de impresión se corta a 500 caracteres (runas), no unidades UTF-16 | Como en P2a; solo cambia con emojis |
| P2d-2 | `os=constructor`, `os=toString` y demás nombres de `Object.prototype` en `check-version` y `download` responden 400; en Nest, 500 | Bug de Nest que no se copia: `BINARIES[os]` encuentra la función del prototipo y `join` falla |
| P2d-2 | Un parámetro de query repetido (`?os=a&os=b`, `establishmentId`, `code`) se lee como el primero; en Nest llega como array y la ruta responde 400 o 500 | `URL.Query().Get` devuelve el primer valor; ningún cliente repite parámetros |
| P2b-3 | `PATCH /admin/establishments/{id}/modules` olvida la caché de módulos del local después de guardar | Nest no la olvida, y con Redis el cambio tardaba hasta 8 h en llegar a los guards |
| P2b-3 | En `PATCH /admin/users/{id}`, un `active: null` junto a un cambio de rol se ignora; Nest pasa el `null` a Prisma y responde 500 | Como en P2a: un campo que no admite nulos no distingue `null` de ausente |
| P2b-3 | `page` y `pageSize` de la query se leen con `strconv.ParseFloat`: `0x10`, `0b1` u `0o7` son `INVALID_TYPE` (`Number()` los acepta) y una página por encima de 2^53 se queda en 2^53 | Nadie los manda así; los enteros, decimales y el vacío se leen como `Number()` |
| P2b-3 | Las longitudes máximas (`q`, `targetId`, `email`, `note`, `name`, `reason`) cuentan caracteres (runas), no unidades UTF-16 | Como en P2c; solo cambia con emojis y otros caracteres fuera del plano básico |
| P2b-1 | `PATCH /users/me` guarda el `name` sin espacios alrededor y responde 400 `REQUIRED` si queda vacío, y 400 `INVALID_TYPE` si `language` no es `es` ni `en` (también `""`, que Nest ignoraba). Nest acepta cualquier texto en los dos | Arreglado en Go; Nest sigue con el bug. `apps/web` solo manda `language` con `es` o `en` |
| P2b-1 | Un admin de la plataforma sobre un local que no existe recibe 404 `ESTABLISHMENT_NOT_FOUND` en `GET /establishments/{id}`, `GET …/settings` y `PATCH …/settings`. Nest responde 200 `null`, los ajustes por defecto y un 500 (clave foránea) | Arreglado en Go; Nest sigue con el bug. Un usuario normal ya recibía el 403 del guard antes |
| P2b-2 | Invitar a un usuario que ya existe no le cambia el `name`; Nest lo cambia por lo que va antes de la `@` sin publicar `UserUpdatedEvent` | Arreglado en Go; Nest sigue con el bug. Como no cambia nada del usuario, no hace falta olvidar su caché |
| P2b-2 | El email de la invitación lleva el nombre de quien invita (`MemberInvitedEvent.InviterName`), como al reenviarla; en Nest lleva el nombre del invitado | Arreglado en Go; Nest sigue con el bug |
| P2b-2 | Invitar pasa el email a minúsculas y le quita los espacios, como el login: `Ana@X.com` encuentra al usuario `ana@x.com`. Nest lo guarda tal cual y crea otro usuario que no puede entrar con contraseña | Arreglado en Go; Nest sigue con el bug. Los usuarios con mayúsculas que ya creó Nest no se tocan |
| P2b-2 | Volver a invitar sin `role` a un miembro quitado lo trae como STAFF; Nest le devuelve su rol antiguo, así que un MANAGER podía devolver a un ex-OWNER como OWNER | Arreglado en Go; Nest sigue con el bug |
| P2b-2 | Reenviar la invitación de un miembro inactivo responde 404 `MEMBER_NOT_FOUND`, como la de un usuario inactivo; Nest solo mira si el usuario está activo | Arreglado en Go; Nest sigue con el bug |
| P2b-3 | `memberCount` (locales) y `establishmentCount` (usuarios) del backoffice solo cuentan membresías activas y no eliminadas, y la búsqueda de locales por email ya no encuentra miembros eliminados (sí los inactivos, que siguen en la ficha del local). Nest cuenta y busca también las eliminadas | Arreglado en Go; Nest sigue con el bug |
| P2b-3 | Una concesión con `manualPlan = FREE` no cuenta como concesión viva en el filtro `billingSource=MANUAL` ni en las métricas (`subscriptions.manual` y `withAccess`), igual que en la fila y en el guard (`isManualGrantActive`). Nest sí la cuenta en el filtro y en las métricas | Arreglado en Go; Nest sigue con el bug |
| P2b-3 | El filtro `billingSource` usa la misma regla que la fila y que la métrica `subscriptions.stripe`: STRIPE es acceso vigente por Stripe (periodo pagado, prueba o cancelado sin acabar) sin concesión viva, y NONE ni lo uno ni lo otro. En Nest el filtro STRIPE es tener `stripeSubscriptionId` aunque haya caducado, y una prueba en curso sale en NONE | Arreglado en Go; Nest sigue con el bug. Pinchar en la cifra de Stripe del resumen lleva a una lista con el mismo número de locales |
| P2b-3 | Una suscripción PAST_DUE sale en el backoffice con acceso y `billingSource` STRIPE (fila, filtro y métricas), como la trata el guard, que deja escribir mientras Stripe reintenta el cobro. Nest la muestra sin acceso | Arreglado en Go; Nest sigue con el bug. Decisión de producto: se mantiene el periodo de gracia del guard y el backoffice lo refleja, en lugar de cortar el acceso en cuanto falla un cobro |
| P2b-3 | La métrica `users.admins` solo cuenta admins activos; Nest cuenta también los desactivados | Arreglado en Go; Nest sigue con el bug |
| P2b-3 | `PATCH /admin/establishments/{id}` mira la longitud mínima del nombre después del `trim`: `"   ab   "` responde 400 `message: "MIN_LENGTH"` (texto, no lista, porque lo comprueba el servicio). Nest valida antes del `trim` y guarda `ab`. Renombrar no publica más evento que el `AdminActionEvent` de la auditoría, igual que Nest | Arreglado en Go; Nest sigue con el bug. No se añade un evento de dominio de renombrado porque nadie lo escucharía: ninguna caché guarda el nombre y el realtime no tiene evento para el local |
| P2b-3 | `/admin/audit` y la actividad reciente de la ficha ordenan por `createdAt` y después por `id` (los dos de más nuevo a más viejo), así que la paginación no repite ni se salta entradas del mismo instante. Nest ordena solo por `createdAt` | Arreglado en Go; Nest sigue con el bug |
| P2d-1 | `GET /orders?date=` solo lee `YYYY-MM-DD`; cualquier otra cosa responde 500, como una fecha que `Temporal.PlainDate.from` no entiende | `PlainDate.from` acepta además fecha y hora y otras formas ISO; `apps/web` y la IA mandan `YYYY-MM-DD` |
| P2d-1 | `null` en `notes`/`ticketNotes` de `PATCH /orders/{id}/notes` o en `name` de `PATCH /tables/{id}` se ignora como si no viniera; Nest responde 500 (`.trim()` de `null`, o Prisma con `null` en una columna que no lo admite) | El mismo criterio que P2a; `apps/web` manda texto. En `POST /orders/{id}/items`, `notes: null` sí vacía las notas, como en Nest |
| P2d-1 | Las notas del pedido y de las líneas y el motivo de un ajuste se cortan a 500 caracteres (runas), y `@MaxLength(500)` también cuenta runas, no unidades UTF-16. `trim` no quita el BOM (U+FEFF) | Solo cambia con emojis y otros caracteres fuera del plano básico |
| P2d-1 | Los ajustes de un pedido salen ordenados por `createdAt` e `id` | Nest los pide sin `orderBy` y salen en el orden en que Postgres los devuelva |
| P2d-1 | En `orderIds` de `POST /orders/merge`, cada id que no es UUID da su propio `INVALID_TYPE`; class-validator da uno por campo | validator comprueba cada elemento con `dive`. Viene de P0 y pasa igual con cualquier `{ each: true }` |
| P3 | **Pendiente de confirmar por Miguel.** Los cuatro modelos de respaldo van en el cuerpo de la API compatible con OpenAI como `providerOptions: {gateway: {models: [...]}}`; Nest los pasa con las `providerOptions` del proveedor `gateway` del AI SDK | Sin el SDK de Vercel no hay proveedor `gateway`. Es lo que documenta el AI Gateway para Chat Completions (también acepta `models` en la raíz del cuerpo), pero no se ha podido probar sin la clave de verdad. Si el gateway no los leyera, Go solo usaría `zai/glm-4.7` |
| P3 | Go habla con el gateway por su API compatible con OpenAI (Chat Completions); Nest, con el protocolo propio del proveedor `gateway` del AI SDK. El razonamiento que devuelva el modelo no vuelve en los pasos siguientes | Es la API que se puede usar con openai-go ([librerías](librerias.md)); el texto, las herramientas y sus resultados son los mismos |
| P3 | Las herramientas que el modelo pide en un mismo paso se ejecutan una detrás de otra, en su orden; el AI SDK las lanza a la vez | Mismos resultados sin escrituras a la vez sobre el mismo pedido o mesa |
| P3 | El texto que recibe el modelo cuando la entrada de una herramienta no cumple su esquema imita el de zod (`Invalid input for tool …: Type validation failed: …` con sus issues), pero el orden de los campos de cada issue puede cambiar, falta el `note` de un entero fuera del rango seguro y el error de un JSON roto es el de Go | La comprobación se escribe a mano sobre el esquema; el modelo solo lo lee para corregirse |
| P3 | Un cuerpo de `POST ai` con `messages` que no es una lista se trata como si no viniera (se usa `prompt`) y un mensaje con campos de otro tipo los lee vacíos; en Nest lo primero es un `TypeError` (500, o el `done` de error en el stream) y lo segundo el error del gateway | El cuerpo no tiene DTO en Nest y `apps/web` siempre manda texto y una lista |
| P3 | `AI_MONTHLY_MESSAGES` o `AI_TRIAL_MONTHLY_MESSAGES` que no son un entero usan el valor por defecto; en Nest `Number()` da `NaN`, la cuota nunca se agota y `GET usage` responde `null` | Bug de Nest que no se copia. Un `0` sí apaga el asistente, como en Nest |
| P3 | Sin `AI_GATEWAY_API_KEY` Go falla sin llamar al gateway; el AI SDK aún prueba el token OIDC de Vercel | La API no corre en Vercel; la respuesta es la misma (201 con el error traducible) |
| P3 | `POST ai/stream` manda las cabeceras en cuanto empieza; Node las manda con el primer `delta` o con el `done` | Así el cliente no espera sin respuesta mientras el modelo piensa; las cabeceras son las mismas |
| P3 | El error de una herramienta que no es de negocio (la base de datos caída, una fecha imposible en `getOrdersByDate`) lleva el texto del error de Go, no el de Prisma o Temporal | Como en el resto de paquetes; los errores con código de `ErrorCodes` son idénticos y llevan `errorKey` |
| P2d-1 | Cancelar, mover de mesa y quitar la última línea solo escriben si el pedido sigue `OPEN` (en la misma transacción); si no, 400 `ORDER_NOT_OPEN`. Un cancel a la vez que un cobro ya no cancela un pedido cobrado ni devuelve su stock | Arreglado en Go; Nest sigue con el bug |
| P2d-1 | Borrar un pedido abierto responde 400 `CANNOT_DELETE_OPEN_ORDER` (texto suelto, como `CANNOT_DELETE_PAST_ORDER`) en vez de `ORDER_NOT_OPEN`; mover un pedido a su misma mesa responde 200 sin hacer nada ni publicar eventos | Arreglado en Go; Nest sigue con el bug |
| P2d-1 | `merge`: un pedido de otro local es 404 `ORDER_NOT_FOUND`, como uno que no existe, y la mesa destino ocupada da 400 `TABLE_ALREADY_OCCUPIED` salvo que sea la de uno de los pedidos que se juntan | Arreglado en Go; Nest sigue con el bug |
| P2d-1 | Un ajuste se compara con el neto que queda: el `netTotal` del pedido para un ajuste ORDER y el total de la línea con sus descuentos para uno ITEM (`NEGATIVE_TOTAL_NOT_ALLOWED` si lo pasa). Un ajuste ORDER no guarda `itemId`, y crear un pedido con un ajuste ITEM responde 404 `ORDER_ITEM_NOT_FOUND` (o `itemId is required for ITEM target` sin línea), porque sus líneas aún no existen | Arreglado en Go; Nest sigue con el bug |
| P2d-1 | `GET /orders?status=` con un valor que no es `OPEN`, `CLOSED` ni `CANCELLED` responde 400 `INVALID_TYPE` (vacío sigue siendo todos). En el bulk, `paymentMethod` solo acepta `CASH` y `CARD` (`items.N.INVALID_TYPE`); la IA que cobra con `NONE` o `MIXED` recibe `INVALID_TYPE` | Arreglado en Go; Nest sigue con el bug |
| P2d-2 | `check-version` responde 404 «No bridge binary is published for this OS yet» cuando falta el binario (400 solo para un OS no soportado) y el sha256 se vuelve a calcular si cambian el tamaño o la fecha del archivo | Arreglado en Go; Nest sigue con el bug |
| P2d-2 | `POST printer/pair` quita espacios y pasa a mayúsculas antes de mirar la longitud: un código de otra longitud es 404 `PRINTER_PAIRING_INVALID` en vez del 400 de validación | Arreglado en Go; Nest sigue con el bug |
| P2d-2 | Reclamar un trabajo es una sola sentencia con `FOR UPDATE SKIP LOCKED`: si otro puente se lleva uno, se da el siguiente. `GET …/printer/jobs/{jobId}` también devuelve a la cola (o falla) los trabajos colgados. `POST …/printer/pairing` sobre un local inexistente responde 404 `ESTABLISHMENT_NOT_FOUND` | Arreglado en Go; Nest sigue con el bug |
| P2d-3 | Las estadísticas agrupan por día, semana, mes y año en `Europe/Madrid`, no en la zona del proceso (UTC en Cloud Run): un pedido de las 00:30 cuenta ese día | Arreglado en Go; Nest sigue con el bug |
| P2d-3 | La previsualización del cierre lee el último cierre, los pedidos sin cerrar y lo cobrado en los abiertos en una transacción `REPEATABLE READ` de solo lectura; los cierres del mismo instante se ordenan por `id`; cerrar la caja de un local inexistente responde 404 `ESTABLISHMENT_NOT_FOUND` | Arreglado en Go; Nest sigue con el bug |
| P3 | En `POST ai/stream`, un rechazo con código (`AI_QUOTA_EXCEEDED`, `MEMBER_NOT_FOUND`) llega en el `done` como `{"text":código,"isError":true,"errorKey":código}`, que `apps/web` traduce; los demás errores siguen siendo `ai_gateway_failed` | Arreglado en Go; Nest sigue con el bug |
| P3 | El mensaje se reserva antes de llamar al modelo con un solo `INSERT … ON CONFLICT … WHERE messages < cuota`, así que varios a la vez no pasan la cuota; si el modelo no responde, se devuelve. Un fallo de la base de datos al reservar es un 500 antes de ejecutar nada | Arreglado en Go; Nest sigue con el bug |
| P3 | `createOrder` y `addOrderItems` fallan sin tocar nada si algún producto no está en la carta y dicen cuáles; `getOrdersByDate` suma el `orderTotal` de los pedidos cerrados (lo que enseña cada pedido); `updateProduct` rechaza un precio negativo | Arreglado en Go; Nest sigue con el bug |

## Riesgos

- **El contrato de la API tiene que ser idéntico**: rutas (`/api/v1/...`), forma del JSON,
  cuerpo de los errores de Nest (`statusCode`, `message`, `error`), los `ErrorCodes` de la web,
  los errores de validación y las cookies. Si algo cambia, se rompe `apps/web`.
- **Contraseñas**: argon2 en Go tiene que verificar los hashes existentes.
- **Tokens**: mismos claims y mismo secreto, para que nadie tenga que volver a iniciar
  sesión al hacer el cambio.
- **Migraciones**: mientras Nest sirva en algún entorno, las de goose no pueden romperlo (ver
  «Base de datos» en [convenciones](convenciones.md)). Los triggers de `TimeEntry` y el índice
  parcial de `ShiftExchange` están en las migraciones SQL, así que no se pierden.
  La tabla `_prisma_migrations` deja de usarse.
- **Tipos compartidos**: están en los `models/` de cada dominio de la web y se mantienen a mano.
  Los tests de `domain/` comparan los códigos de error, los permisos y los eventos de realtime
  con esos ficheros; el resto de formas solo lo comprueban los e2e.
- **IA**: queda por confirmar que el AI Gateway lee los modelos de respaldo que Go le manda por su API
  compatible con OpenAI (`providerOptions.gateway.models`).

## Costes en Cloud Run

- Alrededor del 90–95 % del precio de una instancia es **CPU**, así que usar menos RAM
  ahorra poco. Lo que ahorra es **tener menos instancias**.
- Hoy cada stream SSE ocupa 1 de los **80 huecos de concurrencia**, así que sale una
  instancia nueva cada ~8 locales. Con concurrencia a 1000 o más, una instancia aguanta
  unos 100. Esto también se puede hacer en Nest.
- Go usa todos los vCPU de la instancia; Node solo uno.
- Con **una sola instancia** no hace falta Redis (ver `docs/operations/redis.md`), y Go
  hace que esa instancia dé para mucho más.
- Arranque en frío de menos de 200 ms, así que `min-instances 0` es aceptable.
- Pendiente: calcular el ahorro real con la factura de GCP desglosada (Cloud Run, base de
  datos, Redis e IA).
