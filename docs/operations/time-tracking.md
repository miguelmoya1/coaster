# Fichaje y control horario

Registro de jornada del art. 34.9 del Estatuto de los Trabajadores. La ley pide tres cosas que
condicionan el diseno: que el fichaje original no se pueda sobrescribir, que toda correccion deje
rastro de quien, cuando, que y por que, y que el trabajador pueda consultar su jornada y las
modificaciones hechas sobre ella.

El modulo vive en `apps/api/src/time-tracking` y cuelga de `bars/:barId/time-entries`.

## La tabla es el rastro

`TimeEntry` es **append-only**. No hay `UPDATE` ni `DELETE`: la base de datos los rechaza con un
trigger (`time_entry_append_only`). Corregir una marca significa insertar una fila nueva que
apunta a la anterior por `supersedesId`.

```text
entry-1  RECORDED  08:00  (fichaje del trabajador)
entry-2  AMENDED   09:00  supersedes entry-1  motivo: "olvido fichar la entrada"
entry-3  VOIDED    09:00  supersedes entry-2  motivo: "marca duplicada"
```

Las tres filas comparten `rootId = entry-1`. De ahi sale todo:

- **estado actual** de una marca: la fila del grupo con `sequence` mas alta (nadie la supersede);
- **historial**: el grupo entero, ordenado, que es lo que se devuelve en `TimeEntry.revisions`;
- **marca anulada**: el grupo cuya cabeza es `VOIDED`. No se borra ni se esconde, se muestra
  marcada; no cuenta para los totales.

Como no hay estado mutable, no existe la posibilidad de que el dato y su auditoria se separen: son
la misma fila. Por eso la traza **no** se escribe en un manejador de evento aparte, a diferencia
del backoffice: alli una auditoria perdida es un fallo de registro, aqui seria una sancion.

## Cadena de hash

Cada fila lleva `sequence` (monotonico por bar), `prevHash` y `hash`:

```text
hash = sha256(prevHash + "id|barId|userId|rootId|type|action|occurredAt|recordedAt|source|supersedesId|actorId|reason|sequence")
```

La insercion toma `pg_advisory_xact_lock(hashtext(barId))` para que dos fichajes simultaneos del
mismo bar no bifurquen la cadena. El `id` es un UUID generado en el repositorio, no por la base de
datos, porque entra en el hash y hay que conocerlo antes del `INSERT`.

`recordedAt` (reloj del servidor) va dentro del hash junto a `occurredAt`, asi que la cadena sella
tanto la hora fichada como la fecha en que se registro o se corrigio.

`GET /bars/:barId/time-entries/integrity` recalcula la cadena entera del bar y responde si es
valida y, si no, en que fila se rompe. Un `UPDATE` a pelo en base de datos —tras eliminar el
trigger— invalida esa fila y todas las siguientes.

## Jornada

Una marca es de tipo `CLOCK_IN`, `BREAK_START`, `BREAK_END` o `CLOCK_OUT`, y solo se admite si la
maquina de estados la acepta: fuera → dentro → pausa → dentro → fuera. Las pausas son marcas de
pleno derecho y se corrigen igual que la entrada y la salida.

`workdayDate` agrupa la jornada, no el dia natural: un turno que entra a las 22:00 y sale a las
03:00 pertenece entero al dia en que empezo. La zona horaria es `Europe/Madrid`
(`WORKDAY_TIME_ZONE`).

Los fichajes del propio trabajador usan **la hora del servidor**; el cliente no la envia. Las horas
que llegan del cliente solo existen en las correcciones, que exigen motivo y quedan firmadas.

## Endpoints

| Metodo y ruta       | Permiso                   | Para que                                       |
| ------------------- | ------------------------- | ---------------------------------------------- |
| `POST /clock`       | `bar:clock-in`            | Fichar uno mismo (entrada, pausas, salida)     |
| `GET /me`           | ser miembro del bar       | Mi jornada con su historial de modificaciones  |
| `GET /`             | `bar:view-time-entries`   | Jornadas del equipo, filtrando por persona     |
| `GET /export`       | `bar:view-time-entries`   | CSV con una fila por revision, para Inspeccion |
| `GET /integrity`    | `bar:manage-time-entries` | Verificacion de la cadena de hash              |
| `POST /`            | `bar:manage-time-entries` | Alta manual de una marca olvidada              |
| `POST /:id/amend`   | `bar:manage-time-entries` | Corregir la hora de una marca                  |
| `POST /:id/void`    | `bar:manage-time-entries` | Anular una marca                               |

`bar:clock-in` lo tiene todo el mundo; los otros dos, `MANAGER` y `OWNER`. Corregir y anular
exigen motivo (minimo 5 caracteres) y se rechazan si dejarian la jornada descuadrada
(`INVALID_CLOCK_SEQUENCE`), por ejemplo anular una entrada y dejar la salida huerfana.

`GET /me` no lleva permiso: cualquier miembro ve sus propios fichajes y las correcciones que le
hayan hecho, que es justo lo que exige la ley.

`POST /clock` lleva `@SkipSubscriptionCheck()`. Un bar que deja de pagar pierde la escritura, pero
no puede perder el registro de jornada de sus trabajadores: la obligacion legal no depende de que
la suscripcion este al dia. Corregir y dar de alta marcas si exigen suscripcion viva.

## Conservacion

Las claves ajenas de `TimeEntry` son `RESTRICT`, no `CASCADE`: borrar un usuario o un bar con
fichajes falla. Ademas cada fila guarda `userSnapshot` con el nombre y el email del trabajador en
el momento del fichaje, para que el registro se sostenga aunque la cuenta cambie. Los cuatro anos
de custodia legal son una politica de borrado, no una limpieza automatica: hoy no hay ninguna.

## Interfaz

El fichaje **no tiene seccion propia** en la barra inferior: vive dentro de **Turnos**
(`presentation/bars/workspace/pages/roster`), en la vista de dia, porque es donde el trabajador ya
va a ver su turno. Toda la gestion se hace desde ahi.

- **Tarjeta de fichaje** (`clock-card`): estado actual, tiempo trabajado y de pausa, y solo los
  botones que la jornada admite en ese momento. La ve quien tenga `bar:clock-in`, o sea todos.
- **Mi jornada** (`workday-card`): las marcas del dia con sus insignias —manual, modificada,
  anulada— y un desplegable con el historial de revisiones (hora anterior, quien y por que). Una
  marca anulada no desaparece: sale tachada.
- **Registro del equipo**: la misma tarjeta por cada trabajador, para quien tenga
  `bar:view-time-entries`, con **Descargar CSV**. Con `bar:manage-time-entries` aparecen ademas
  corregir, anular, anadir marca y verificar integridad.
- **Correcciones**: hojas inferiores (`time-entry-form`, `void-entry-form`) que exigen motivo de al
  menos 5 caracteres; el boton de guardar no se habilita sin el.

La geolocalizacion se pide al fichar y es opcional: si el navegador la deniega o tarda mas de 3
segundos, el fichaje sale igual sin coordenadas.

### Permisos, no roles

De paso, la pagina de turnos dejo de mirar `BarRole.OWNER` para decidir que ensena. Crear turnos,
el bloque de replicacion semanal y el boton de borrar se gobiernan ahora por `bar:create-shift` y
`bar:delete-shift`. Antes un `MANAGER` tenia los permisos en la API pero la interfaz le escondia
los botones.

## Auditoria en el backoffice

`AuditTimeEntryChangedHandler` escucha `TimeEntryRecordedEvent`, `TimeEntryAmendedEvent` y
`TimeEntryVoidedEvent`, y solo cuando el actor es un admin de plataforma publica `AdminActionEvent`
con `TIME_ENTRY_CREATED`, `TIME_ENTRY_AMENDED` o `TIME_ENTRY_VOIDED`. Un fichaje normal de un admin
no ensucia el log del panel; una correccion suya sobre la jornada de otro, si.

## Pendiente

- Export en PDF: hoy solo hay CSV, que ya sirve para entregar a Inspeccion.
- Sellado diario del `hash` cabeza de cadena para anclar la fecha ante terceros.
- Rango libre de fechas en la interfaz: hoy el registro y el export van por el dia seleccionado en
  el calendario de turnos.
