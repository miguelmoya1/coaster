# Pendiente

Lo que está a medias y por qué, para no perderlo entre conversaciones.

> Coaster y Fichit son dos productos separados desde el 4 de septiembre de 2026, sin código ni
> credenciales en común. Lo que queda aquí de Fichit son los dos sitios donde comparten
> **infraestructura** —la cuenta de correo y las claves que pasaron por un chat—, no dependencias.
> El detalle de la separación está en `SEPARACION.md`, en la raíz de `dev/`.

## Salir de Firebase: cuentas propias

**El código está hecho y no queda una línea de Firebase en el repositorio.** Login con email y
contraseña, Google como identidad vinculable a la misma persona, correos de confirmación,
recuperación e invitación, y página de cuenta. Lo que queda son pasos **fuera** del repositorio, y
están al final de esta sección: crear el cliente de OAuth, comprobar el dominio en Resend,
desplegar, y solo entonces apagar Firebase.

### Los pasos que quedan, en orden

1. ~~Crear el cliente OAuth de tipo Web.~~ **Hecho.** El cliente es
   `774617138158-913akavif3caajj8b79vgjfd9011acov`. **El secreto del cliente no se usa en ninguna
   parte**: el flujo de token de identidad no lo necesita, solo lo pediría el flujo de código de
   autorización, que se descartó a propósito. No lo pongas en ninguna variable.
2. ~~Poner `GOOGLE_CLIENT_ID`.~~ **Hecho** en los dos servicios de Cloud Run y en los dos proyectos
   de Vercel. En Vercel es variable **de compilación**, así que el botón no aparece hasta el
   siguiente despliegue.
3. ~~Decidir el remitente de los correos.~~ **Hecho:** con `coaster.business` ya verificado en
   Resend, `EMAIL_FROM` vuelve a `Coaster <hello@coaster.business>`, que es el valor que el código
   trae por defecto. Los comandos están en la sección de Resend, más abajo.
4. **Desplegar a `dev`.** Las migraciones se aplican solas en el despliegue.
5. **Entrar en beta con Google** y comprobar que caes en tu usuario de siempre, con tus
   establecimientos. Es lo que confirma que la correspondencia por correo verificado funcionó.
6. **Solo entonces, apagar Firebase** y borrar `firebaseUid`, en el orden del final de esta sección.

Lo que sigue documenta las decisiones y por qué se tomaron, porque el porqué es lo que se pierde.

### Lo que no se puede hacer, y por qué

**`coaster-437f2` no es «el proyecto de Firebase». Es el proyecto de GCP.** Ahí viven el Artifact
Registry (`europe-west1-docker.pkg.dev/coaster-437f2/coaster-repo/api-new`), los dos servicios de
Cloud Run, los jobs de migración, la service account de GitHub Actions, el workload identity pool y
los buckets de imágenes. Borrarlo desde la consola de Firebase **borra todo eso**.

Lo que se hace al final no es borrar el proyecto, es dejar de usar Firebase dentro de él:
desactivar el proveedor de Google en Authentication, borrar los usuarios, borrar el registro de la
Web App y quitar las dependencias. El proyecto se queda donde está.

### Decisiones tomadas

| Qué          | Decisión                                                                                                                            |
| :----------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| Sesión       | Access JWT propio de 15 min en memoria como `Bearer` + refresh opaco en cookie `httpOnly`, deslizante a 30 días desde su último uso |
| Modelo       | `passwordHash` en `User`, tabla `AuthIdentity` solo para proveedores externos                                                       |
| Verificación | Se entra sin verificar, con aviso en la interfaz                                                                                    |
| Analítica    | Se queda Vercel Analytics. No hay Firebase Analytics en el código: no hay nada que quitar                                           |

El access token sigue siendo un `Bearer`, así que el interceptor del front y los 22 controladores
con guard no cambian de semántica. El refresh va en cookie sobre `.coaster.business` —web y API
comparten dominio registrable, así que es _same-site_ y basta `SameSite=Lax`—, se rota en cada uso
y se guarda hasheado, con detección de reuso por familia. Solo el endpoint de refresh necesita
pensar en CSRF.

Los 15 minutos no los ve nadie: cuando el access token caduca, el front llama solo a `/auth/refresh`
y sigue. Lo que se le acaba a alguien que usa la aplicación cada día no es la sesión, porque la
cookie se renueva en cada uso; solo vuelve a ver el login quien pase 30 días enteros sin abrirla.

Dos tiempos distintos y dos columnas distintas: `rotatedAt` cuando a una sesión la sustituye su
sucesora, `revokedAt` cuando se la mata. Una sesión rotada hace menos de 30 segundos se deja pasar
—son dos pestañas refrescando a la vez, no un robo—, pero una revocada no se perdona nunca, que es
lo que hace que cerrar sesión surta efecto en el acto y no medio minuto después.

Dos cosas que ya existen y se copian en vez de inventarse: el JWT firmado con HMAC de
`printer-token.service.ts` y la comparación en tiempo constante de `device-key.service.ts`.

### El esquema

```
User            + passwordHash, passwordUpdatedAt, emailVerifiedAt      − firebaseUid
AuthIdentity      provider, subject, userId          @@unique([provider, subject])
AuthSession       userId, tokenHash, familyId, expiresAt, rotatedAt, revokedAt
AuthToken         userId, purpose, tokenHash, expiresAt, usedAt
```

La contraseña es una por persona, así que es una columna de `User` y no una fila con la mitad de
las columnas vacías. `AuthIdentity` sustituye a `firebaseUid` y admite Apple o Microsoft sin tocar
el esquema. `AuthToken` lleva un `purpose` —`EMAIL_VERIFICATION`, `PASSWORD_RESET`, `INVITE`—: una
tabla, tres usos, ninguna rama.

### Google sin Firebase

Google Identity Services con el flujo de ID token: un cliente OAuth de tipo Web con
`www.coaster.business`, `beta.coaster.business` y `http://localhost:4200` como orígenes
autorizados, y **ningún redirect URI**. El front recibe un JWT y la API lo verifica contra el JWKS
de Google comprobando `aud`, `iss` y `email_verified`. Con los scopes `openid email profile` no hay
revisión de verificación por parte de Google; la pantalla de consentimiento sí hay que rellenarla.

**El `firebaseUid` guardado no sirve para esto.** El `sub` de un token de Firebase es el UID de
Firebase, no el `sub` de la cuenta de Google. La correspondencia se hace por email verificado, y por
eso no hay migración de datos que hacer: la primera vez que cada uno entre con Google, se le crea su
`AuthIdentity` y cae en su registro de siempre.

### Los correos

Cuatro correos sobre una plantilla común: invitación, confirmación de dirección, recuperación de
contraseña y aviso de que la contraseña cambió.

El `EmailService` **ya no se traga los errores**, que era lo que tenía que cambiar antes de que de
él colgara una recuperación de contraseña: donde alguien está esperando el correo el fallo se ve, y
donde el correo es solo un aviso se registra y la operación sigue.

`coaster.business` quedó **verificado en Resend** el 10 de septiembre de 2026, así que el remitente
vuelve a `hello@coaster.business`; el detalle y los comandos están más abajo.

### Los invitados

Se invita a alguien que no tiene contraseña ni cuenta de Google vinculada. El correo lleva a
`/invite/:token` y esa página ofrece las dos vías: elegir contraseña, o continuar con Google.
Cualquiera de las dos consume el token, y como el token llegó a su buzón vale también como prueba
de que la dirección es suya: entra ya verificado.

Mientras no lo consuma, la fila de `User` existe pero no puede entrar por ningún sitio, que es lo
que pasa hoy. Si el invitado ya tenía cuenta, no hay token: se le añade la membresía y se le avisa.

### La migración de lo que hay

Producción tiene 4 usuarios y beta poco más, todos de Miguel, todos entrando con Google. No hace
falta migrar datos: cuando cada uno entre por el flujo nuevo se le crea su `AuthIdentity` por email.
La migración de esquema pone `emailVerifiedAt = createdAt` en los existentes —ya estaban
verificados por Google— y `firebaseUid` se borra en una migración posterior, cuando no quede código
que lo lea.

Eso de tener el correo ya verificado no es cosmético: es lo que hace que a esas cuentas la
vinculación con Google no les toque la contraseña. Una cuenta con el correo **sin** verificar pierde
la contraseña cuando Google demuestra la dirección, porque quien la puso nunca demostró ser el dueño
del buzón.

### El orden

Lo que depende de terceros va primero porque no comprime: el cliente OAuth y la pantalla de
consentimiento en Google Cloud, y la comprobación del dominio en Resend. Son clics, pero hasta que
no estén no se puede probar nada de extremo a extremo.

Lo demás son cuatro frentes que no se pisan:

1. ~~**Esquema y contraseña.**~~ **Hecho el 9 de septiembre de 2026.** Migración
   `20260909092402_auth_own_accounts`, Argon2id a 19 MiB, registro, login, refresh con rotación y
   logout; `AccessTokenService` sustituye a `FirebaseTokenService`, `AuthGuard` a `FirebaseAuthGuard`
   y Passport se ha ido entero. Front rehecho: páginas de login y registro, sesión que se recupera
   sola al arrancar y un 401 que refresca y reintenta en vez de echarte. 841 unitarios de API, 232
   e2e, 1131 de web y 25 de Playwright en verde, y el ciclo entero probado en un navegador de verdad.
2. ~~**Google.**~~ **Hecho el 9 de septiembre de 2026.** `POST /auth/google` verifica el token de
   Google contra sus claves publicadas —`aud`, emisor, caducidad y correo verificado—, y el front
   monta el botón oficial de GIS. Vincular es automático: si el correo ya tiene cuenta, la identidad
   se engancha ahí, que es como vuelve cada usuario de Firebase a su registro de siempre. Falta
   **desvincular** y **ponerse contraseña habiendo entrado con Google**: las dos necesitan la página
   de cuenta, que la trae el frente 3.
3. ~~**Correos.**~~ **Hecho el 9 de septiembre de 2026.** Migración `20260909143638_auth_tokens`,
   una plantilla común y cuatro correos —invitación, confirmación, recuperación y aviso de cambio—,
   la invitación rehecha contra `/invite/:token`, y las pantallas de olvido, reinicio, confirmación,
   invitación y **cuenta**, donde se pone contraseña habiendo entrado con Google y se desvincula.
   El `EmailService` ya no se traga los errores: donde alguien espera el correo, el fallo se ve.
4. ~~**Firebase fuera.**~~ **Hecho el 9 de septiembre de 2026.** `media.service.ts` usa
   `@google-cloud/storage` —mismo bucket, mismas credenciales, mismas URLs firmadas v4—, y
   `firebase-admin` ya no está en el `package.json`. El emulador, el paquete `firebase` del front y
   el truco de `__TEST_LOGIN__` se fueron con los frentes 1 y 2. **No queda una sola línea de
   Firebase en el repositorio.**

   Lo único que sobrevive es la columna `firebaseUid`, ya sin código que la lea. Se borra en la
   migración que cierra esto, y a propósito **no antes**: mientras beta no confirme que cada uno
   entra con Google y cae en su registro, es el único rastro para diagnosticar a quien no le case
   el correo.

Los cuatro están hechos. Lo que queda en pie del plan es lo manual —el cliente de OAuth— y el
borrado de `firebaseUid`, que espera a que beta lo confirme.

### Lo único que queda a mano: el cliente de OAuth

No hay CLI que cree un cliente OAuth de tipo web —la de IAP es de otro tipo y además está muerta
desde marzo de 2026—, así que ese paso es de consola y hay que darlo **antes** de desplegar los
frentes 1 y 2:

1. Consola de Google Cloud → **APIs y servicios → Credenciales → Crear credenciales → ID de cliente
   de OAuth → Aplicación web**.
2. **Orígenes de JavaScript autorizados**: `https://www.coaster.business`,
   `https://beta.coaster.business` y `http://localhost:4200`.
3. **URIs de redirección: ninguna.** El flujo de token de identidad no usa ninguna.
4. Rellenar la pantalla de consentimiento (nombre, correo de soporte, logo, enlaces de privacidad y
   términos). Con `openid email profile` no hay revisión por parte de Google.

Con el ID en la mano, va a los dos servicios de Cloud Run y a los dos proyectos de Vercel, el mismo
en todos: no es un secreto, viaja en el bundle.

Enlace directo, con el proyecto ya elegido:
<https://console.cloud.google.com/auth/clients/create?project=coaster-437f2>

La pantalla de consentimiento **probablemente ya esté rellena**: Firebase la configuró al activar el
inicio de sesión con Google. Compruébalo antes de rellenarla de cero.

Hasta que esté, no se rompe nada: la API responde `503 GOOGLE_SIGN_IN_UNAVAILABLE` y el front no
dibuja el botón, pero fuera de una compilación de producción **dice por qué** en el sitio donde
iría, para que no parezca que ha desaparecido.

Lo que sí pasa es que **nadie puede entrar con Google**, y como las cuentas de hoy no tienen
contraseña, sus dueños se quedarían fuera. Si tuvieras que desplegar antes de crear el
cliente, `apps/api/scripts/set-password.mjs` pone una contraseña sobre cualquier cuenta:

```sh
DATABASE_URL='<la de beta>' node apps/api/scripts/set-password.mjs tu@correo.com tu-contraseña
```

### Lo que le falta para estar redondo

Nada de esto rompe nada hoy, y ninguno es urgente. Están en el orden en que yo los haría.

**`FRONTEND_URL` de producción apunta al ápex** y hay que cambiarla a mano, porque los permisos
de este entorno no me dejan tocar la variable de producción. Los enlaces de los correos salen como
`https://coaster.business/...`, el ápex responde `307` a `www` y llegan igual, pero con un salto de
más. La misma variable la usan las URLs de retorno de Stripe, que se quedan igual de válidas:

```sh
gcloud run services update api-new --region europe-west1 \
  --update-env-vars FRONTEND_URL=https://www.coaster.business
```

**Poder reenviar una invitación desde la lista de personal.** Si Resend rechaza el envío, la
invitación queda creada y el correo no sale; hoy no hay forma de reintentarlo desde la aplicación.

**Cerrar sesión no mata el access token, solo el refresh.** El `sid` viaja en el token pero nadie lo
contrasta con la tabla de sesiones, así que uno robado sigue valiendo hasta 15 minutos. Es la
contrapartida normal de un token sin estado, y la razón de que dure lo que dura.

Ojo con la solución fácil, porque no vale: una columna `sessionsRevokedAt` en `User` comparada con
el `iat` del token invalidaría **todas** las sesiones a la vez, y eso rompe el «cierra las demás y
deja la mía» de la página de cuenta, que es justo lo que hace `sid`. Para revocación instantánea de
verdad hay que comprobar la sesión en cada petición: cachear `sesión {sid} viva` y olvidarla al
revocar. Con Redis es barato; sin Redis —como está beta hoy— es una consulta a Postgres por
petición. Es una decisión con coste, no un apaño de cinco líneas.

**Límite por cuenta, no solo por IP.** Los 10/minuto paran a alguien desde una IP. No paran a mil IPs
probando una contraseña contra la misma cuenta.

**Contraseñas filtradas.** Contrastar contra HaveIBeenPwned al registrarse y al cambiarla. Lo
recomienda OWASP, son unas veinte líneas y con k-anonimato no sale la contraseña de casa.

**Registrar los eventos de auth** —entrada, salida, cambio de contraseña, identidad vinculada—.
`AdminAuditLog` cubre el backoffice; esto no lo cubre nadie.

**Ver las sesiones abiertas** desde la aplicación, y poder cerrarlas. Los datos ya están en
`AuthSession`: `userAgent`, `ip`, `lastUsedAt`. Falta la pantalla.

### Cuando esté todo

El repositorio ya no sabe nada de Firebase, pero **producción y beta siguen ejecutando el código
viejo hasta que despliegues**. Apagar Firebase antes de eso deja a todo el mundo fuera en el acto:
el servicio que está vivo hoy verifica tokens de Firebase, y sin proveedor no hay token que
verificar. Por eso esto es lo último, en este orden y no antes de que beta lleve unos días
entrando sin él:

1. Firebase console → Authentication: desactivar Google, borrar los usuarios.
2. Firebase console → borrar el registro de la Web App.
3. Vercel: quitar las variables `FIREBASE_*` de los dos proyectos, que ya no lee nadie.
4. Migración que borra la columna `firebaseUid`, cuando cada usuario haya entrado ya con Google al
   menos una vez y su `AuthIdentity` exista.

**El proyecto de GCP no se borra en ningún paso.** Sigue siendo donde viven el registro de imágenes,
los dos Cloud Run, la service account de CI y los buckets — incluido el que ahora usa
`@google-cloud/storage` con las mismas credenciales de siempre.

## Correo: dominio propio

Coaster ya envía desde el suyo, `hello@coaster.business`, desde que el dominio quedó verificado en
Resend el 10 de septiembre de 2026. **Fichit sigue en `fichit@miguelmo.dev`** a propósito, para no
pagar otro dominio de correo todavía.

Cada uno se cambia en **un sitio distinto**:

| Dónde   | Qué                | Cómo                                                           |
| :------ | :----------------- | :------------------------------------------------------------- |
| Fichit  | `FICHIT_SMTP_FROM` | Desde el panel, `PUT /api/v1/platform/settings`, sin desplegar |
| Coaster | `EMAIL_FROM`       | En el servicio de Cloud Run, sin desplegar                     |

Desde el 9 de septiembre de 2026 los dos son variables de entorno: la cadena a fuego que había en
`email.service.ts` se fue con el frente 3.

## Resend: `coaster.business` verificado, y el remitente vuelve a casa

**El 10 de septiembre de 2026**, comprobando contra las claves reales de los dos servicios de Cloud
Run, las dos cuentas veían **solo `miguelmo.dev`**: `coaster.business` no estaba verificado en
ninguna, y por eso **las invitaciones de producción estaban fallando en silencio** —el código viejo
se tragaba el error de Resend—. Se tapó apuntando `EMAIL_FROM` a `Coaster <coaster@miguelmo.dev>`.

Ese mismo día Miguel verificó `coaster.business` en Resend, con el «auto configure» que detecta que
el DNS está en Vercel e importa los registros de golpe. Comprobado contra la API: **`verified`, en
`eu-west-1`**, en la misma cuenta que usan beta y producción. Así que el remitente puede volver al
valor que el código ya trae por defecto, `Coaster <hello@coaster.business>`:

```sh
gcloud run services update api-beta --region europe-west1 \
  --update-env-vars 'EMAIL_FROM=Coaster <hello@coaster.business>'
gcloud run services update api-new  --region europe-west1 \
  --update-env-vars 'EMAIL_FROM=Coaster <hello@coaster.business>'
```

`EMAIL_FROM` podría incluso borrarse, porque `DEFAULT_FROM` en `email.service.ts` ya es ese valor;
se deja explícito para que la configuración del servicio se lea sola. Y el `EmailService` ya no se
traga los errores, así que si el remitente dejara de ser válido se vería en vez de perderse.

## Rotar lo que pasó por el chat

La clave de API de Resend y la contraseña de la base de Neon se escribieron en una conversación.
Rótalas cuando la beta esté estable.

La clave de socio de Fichit ya no hace falta rotarla: el mecanismo de socio se retiró y la tabla
`partners` no existe, así que la credencial murió con ella.

## Registro horario: la conservación de cuatro años

El art. 34.9 pide conservar el registro cuatro años. Hoy eso se sostiene porque las claves foráneas
de `TimeEntry` son `RESTRICT` y nadie borra, pero **no hay política escrita ni purga automática**.
No es urgente —lo que la ley castiga es no conservarlo, no conservarlo de más— pero conviene que
esté dicho en `docs/operations/time-tracking.md` antes de que se olvide.

El contraste completo contra la normativa vigente está en `NORMATIVA.md`, en la raíz de `dev/`.

## Veri*factu: hay esquema, no hay código

`VERIFACTU.md` son 791 líneas de plan escrito contra este repo, y la migración
`20260825120000_verifactu_w0_invoicing_foundations` ya creó `Invoice` e `InvoiceTaxLine` con todo
lo que pide la AEAT: huella encadenada, `qrPayload`, `aeatStatus`, rectificativas y anulaciones.

**Encima de ese esquema no hay ni una línea de aplicación.** No existe módulo, ni servicio, ni
controlador: `grep` solo lo encuentra en el cliente generado de Prisma. Es el hueco más grande
entre lo que hay en `dev` y un TPV vendible en España.

No es urgente por la razón que dice el propio documento —«no es obligatorio todavía para este caso
y no hay prisa»— y su primera mitad es un TPV mejor con AEAT o sin ella. Pero conviene saber que
está a cero, no a medias.

Un apunte que casi se pierde: la sección 1 de `VERIFACTU.md` dice que la numeración correlativa es
«copiar el primer bloque cambiando el ámbito del lock», y apunta a `time-entry-chain.ts` y
`time-entries.write.repository.ts`. Esos dos ficheros estuvieron borrados entre el 27 de agosto y
el 4 de septiembre, así que ese plan apuntaba a código que no existía. Al devolver el registro
horario han vuelto, y con ellos el punto de partida.

## Producción va muy por detrás de `dev`

Comprobado el 4 de septiembre contra la base de `api-new`: 2 establecimientos, 4 usuarios, 17
comandas, 6 turnos, **0 fichajes**, y **la tabla `Invoice` no existe**. Es decir, los 91 commits
que separan `main` de `dev` —menús, catálogo, cimientos de Veri*factu, notas de comanda— no los ha
visto ningún usuario.

Los 0 fichajes son la otra cara: el registro horario restaurado está probado por 214 e2e y 773
unitarios, pero **nadie lo ha usado nunca en producción**. Antes de contárselo a un cliente como
característica, conviene fichar un día entero desde un local de verdad.

## `MEDIA_BUCKET` en beta

No está puesta en el servicio `api-beta`, así que cae al respaldo del código
(`imagenes-clientes-app`), **que es el bucket de producción**. Las imágenes que subas en beta acaban
ahí, y contradice lo que dice `docs/operations/environments.md`.

Se arregla creando el bucket de beta (las tres órdenes están en ese documento) o poniendo la
variable explícitamente, para dejar claro que apunta a producción a propósito.
