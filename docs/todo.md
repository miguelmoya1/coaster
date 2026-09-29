# Pendiente

Lo que está a medias y por qué, para no perderlo entre conversaciones. Lo terminado está en el
[roadmap](roadmap.md).

## Apagar Firebase

Las cuentas propias están hechas y no queda una línea de Firebase en el repositorio. Lo que queda
es apagarlo, en este orden y no antes de que beta lleve unos días entrando sin él:

1. **Entrar en beta con Google** y comprobar que caes en tu usuario de siempre, con tus
   establecimientos. Es lo que confirma que la correspondencia por correo verificado funcionó.
2. Firebase console → Authentication: desactivar Google, borrar los usuarios.
3. Firebase console → borrar el registro de la Web App.
4. Vercel: quitar las variables `FIREBASE_*` de los dos proyectos, que ya no lee nadie.
5. Migración que borra la columna `firebaseUid`, cuando cada usuario haya entrado ya con Google al
   menos una vez y su `AuthIdentity` exista. Hasta entonces es el único rastro para diagnosticar a
   quien no le case el correo.

**`coaster-437f2` no es «el proyecto de Firebase», es el proyecto de GCP, y no se borra en ningún
paso.** Ahí viven el Artifact Registry, los dos servicios de Cloud Run, los jobs de migración, la
service account de GitHub Actions, el workload identity pool y los buckets de imágenes. Borrarlo
desde la consola de Firebase borra todo eso.

## Sesiones

**Cerrar sesión no mata el access token, solo el refresh.** El `sid` viaja en el token pero nadie lo
contrasta con la tabla de sesiones, así que uno robado sigue valiendo hasta 15 minutos. Es la
contrapartida normal de un token sin estado, y la razón de que dure lo que dura.

Ojo con la solución fácil, porque no vale: una columna `sessionsRevokedAt` en `User` comparada con
el `iat` del token invalidaría **todas** las sesiones a la vez, y eso rompe el «cierra las demás y
deja la mía» de la página de cuenta, que es justo lo que hace `sid`. Para revocación instantánea de
verdad hay que comprobar la sesión en cada petición: cachear `sesión {sid} viva` y olvidarla al
revocar. Con Redis es barato; sin Redis es una consulta a Postgres por petición. Es una decisión con
coste, no un apaño de cinco líneas.

## `MEDIA_BUCKET` en beta

No está puesta en `api-beta`, así que cae al respaldo del código (`imagenes-clientes-app`), **que es
el bucket de producción**: las imágenes que subas en beta acaban ahí. Se arregla creando el bucket
de beta (las órdenes están en [producción y beta](operations/environments.md)) o poniendo la variable
explícitamente.

## Rotar lo que pasó por el chat

La clave de API de Resend y la contraseña de la base de Neon se escribieron en una conversación.
Rótalas cuando la beta esté estable.

## Veri*factu: hay esquema, no hay código

[El plan](plans/verifactu.md) está escrito contra este repo, y la migración
`20260825120000_verifactu_w0_invoicing_foundations` ya creó `Invoice` e `InvoiceTaxLine` con todo
lo que pide la AEAT: huella encadenada, `qrPayload`, `aeatStatus`, rectificativas y anulaciones.

**Encima de ese esquema no hay ni una línea de aplicación.** Es el hueco más grande entre lo que hay
en `dev` y un TPV vendible en España. No es urgente —«no es obligatorio todavía para este caso y no
hay prisa»— y su primera mitad es un TPV mejor con AEAT o sin ella.

La numeración correlativa es «copiar el primer bloque cambiando el ámbito del lock», a partir de la
cadena de hashes del registro horario (`time_entry_chain.go` y `lock_chain.sql`).

## Producción va por detrás de `dev`

`main` se actualizó por última vez el 14 de septiembre de 2026 y `dev` le lleva unos 190 commits,
entre ellos el cambio de la API a Go: producción sigue con Nest y con las migraciones de Prisma
hasta el merge, y la primera vez el job de migraciones adopta el historial de Prisma, como hizo en
beta. Qué falta antes y después está en «Siguiente paso» de la
[migración](apps/coaster-api/migracion.md).

El 4 de septiembre producción tenía **0 fichajes**: el registro horario está probado por e2e y
unitarios, pero nadie lo había usado nunca de verdad. Antes de contárselo a un cliente como
característica, conviene fichar un día entero desde un local de verdad.

## Comandas a cocina y barra: planeado, sin empezar

La siguiente del módulo de sala después del cierre de caja. Hoy la impresora solo saca el ticket
de cobro, y quien pide un plato se lo tiene que cantar a cocina o apuntarlo a mano. La pestaña «Por
servir» ayuda en sala, pero cocina no la mira.

### Lo que hay y lo que falta

El puente de Go conoce **una sola impresora**: la detecta al arrancar
(`internal/infrastructure/printer/manager.go`) y todo lo que llega por el relay va a ella.
`PrintJob` no dice a qué impresora va, y `PrinterConfig` es una fila por establecimiento. El
renderer ya sabe imprimir texto libre (`type: 'raw'`), así que el formato de la comanda no necesita
un tipo nuevo en el puente para empezar.

### El modelo

```
PrinterStation   establishmentId, name, target        («Cocina», «Barra»)
Category       + stationId?                            a dónde va lo de esta categoría
PrintJob       + stationId?                            null = la impresora del ticket, como hoy
OrderItem      + sentQuantity                          cuánto de la línea ya salió a cocina
```

La estación va en la **categoría**, no en el producto, por la misma razón que el IVA: las cañas van
todas a barra y los platos todos a cocina, y la excepción se decide cuando exista, no antes. Una
categoría sin estación no manda comanda a ninguna parte, que es exactamente lo que pasa hoy.

`sentQuantity` es lo que evita mandar dos veces lo mismo: añadir tres cañas a una mesa que ya tenía
dos manda solo las tres nuevas. Es el mismo patrón que `servedQuantity` y `paidQuantity`.

### Cuándo sale la comanda

Al guardar los productos de la comanda, sin un botón aparte: es lo que hace cualquier TPV de bar
y lo que evita que alguien se olvide de «enviar». Lo que se imprime es la diferencia entre
`quantity` y `sentQuantity` de cada línea, agrupada por estación, con la mesa, la hora, quién la
pidió y las notas de cada línea. Las `notes` de la línea sí van a cocina, que es para lo que
están; las `notes` de la comanda siguen siendo internas y no se imprimen nunca.

Quitar una línea que ya salió a cocina imprime una **anulación** en esa estación, para que no se
cocine algo que nadie va a pagar.

### El puente

Es la parte que no comprime, porque hay que publicar un binario nuevo y que cada local lo
actualice (el autoupdate verificado ya existe):

1. Varias impresoras de red por IP, cada una con el nombre de su estación, configuradas desde la
   aplicación y no desde el equipo: el puente las recibe de la API al arrancar.
2. El relay reclama trabajos con su `stationId` y los manda a la impresora que toca.
3. Si una estación no contesta, el trabajo falla con su error y se ve en la aplicación, igual que
   hoy el ticket. No hay reenvío a otra impresora: que la comanda de cocina salga en barra sin que
   nadie lo sepa es peor que un error visible.

### El orden

Esquema y API primero (estaciones, `sentQuantity`, el cálculo de qué sale), con la impresión en
la impresora de siempre mientras el puente no sepa de estaciones: ya sirve en un bar con una sola
impresora en barra. Después el puente, y al final la pantalla de estaciones en Ajustes.
