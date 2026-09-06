# Veri*factu en Coaster

Documento de trabajo para llevar la facturación de la sección de bares a Veri*factu. Está escrito
contra el código tal y como está hoy, no contra un proyecto genérico: los modelos son Prisma, el
dinero son céntimos enteros y cada pieza que ya existe se referencia en vez de reinventarse.

La última sección parte el trabajo en paquetes con sus dependencias. Un agente puede leer su paquete
y las secciones que este cita, y trabajar sin más contexto.

## 0. Estrategia

No es obligatorio todavía para este caso y no hay prisa, así que el orden lo decide el valor y no la
fecha. El trabajo se parte en dos mitades con perfiles muy distintos:

- **El código.** Desglose de IVA, numeración correlativa, huella encadenada, ticket generado en
  servidor, QR en la impresora, anulaciones justificadas, arqueo de caja. Casi todo esto es un TPV
  mejor con o sin AEAT, y se puede hacer en paralelo.
- **La AEAT.** Certificado X.509, entorno de pruebas, declaración responsable como fabricante. Está
  bloqueado por trámites, no por escribir código, y avanza en paralelo sin estar en el camino crítico.

Por eso el interruptor de la sección 8 no es un adorno: permite terminar y usar toda la primera mitad
mientras la segunda espera al certificado.

Un detalle que ahorra la mayor parte del susto: **la generación del XML se valida contra el XSD
oficial en local, sin certificado y sin red**. Cuando el certificado llegue solo queda el transporte.

## 1. Lo que ya está resuelto en el repo

Antes de escribir nada, lo que no hay que inventar:

| Necesidad                                                         | Ya existe en                                                                                                                             |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Cadena de huellas SHA-256, genesis, cadena canónica, verificación | [`time-entry-chain.ts`](apps/api/src/time-tracking/domain/time-entry-chain.ts)                                                           |
| Correlativo sin huecos bajo concurrencia                          | `pg_advisory_xact_lock` en [`time-entries.write.repository.ts`](apps/api/src/time-tracking/data-access/time-entries.write.repository.ts) |
| Corrección inmutable (registro nuevo que referencia al viejo)     | `supersedesId` / `rootId` en `DbTimeEntry`                                                                                               |
| Cálculo de totales, descuentos y pagos                            | `OrderPricingEngine` en [`order-pricing.engine.ts`](packages/common/src/domain/pricing/order-pricing.engine.ts)                          |
| Cobro parcial y división de cuenta                                | `paidQuantityCash` / `paidQuantityCard` por línea                                                                                        |
| Cola de impresión y bridge en el local                            | módulo `printer` + `apps/printer-service` (Go)                                                                                           |
| Renderizado de QR                                                 | `coaster-qr-code` en web (`qrcode-generator`)                                                                                            |
| Interruptor por establecimiento                                   | `DbEstablishmentSettings` + `resolveModules`                                                                                             |
| Registro de acciones sensibles                                    | `DbAdminAuditLog` (patrón, no la tabla)                                                                                                  |

La sección 4 es, en la práctica, copiar el primer bloque cambiando el ámbito del lock. No se escribe
un algoritmo nuevo.

## 2. Modelo de datos

Convenciones que no se negocian, porque son las del repo: prefijo `Db`, `@@map` al nombre sin
prefijo, campos en camelCase, ids `uuid`, **dinero siempre en céntimos enteros**. Nada de `DECIMAL`.

### A. Identidad fiscal del emisor

Hoy `DbEstablishment` es `id + name`. Una factura necesita más:

```prisma
model DbEstablishment {
  // ...campos actuales
  taxId       String?  // NIF/CIF del obligado tributario
  legalName   String?  // razón social, distinta del nombre comercial
  fiscalAddress String?
}
```

Nullable porque los establecimientos existentes no lo tienen. La emisión con Veri*factu activo exige
los tres; el flag no se puede encender sin ellos.

### B. Interruptor

```prisma
model DbEstablishmentSettings {
  // ...campos actuales
  verifactuEnabled Boolean @default(false)
  invoiceSeries    String  @default("VF")
}
```

### C. Tipo de IVA en el catálogo

```prisma
model DbProduct {
  // ...campos actuales
  taxRate Int @default(1000) // puntos básicos: 2100 = 21%, 1000 = 10%, 400 = 4%
}
```

Puntos básicos enteros, por la misma razón que el dinero: nunca un float en un cálculo fiscal.

El defecto de 10% cubre **toda** la carta de un bar, alcohol incluido. Es el punto donde más fácil
es equivocarse: en hostelería lo que manda es el servicio, no el producto. El art. 91.Uno.2.2º LIVA
grava al 10% «el suministro de comidas y bebidas para consumir en el acto», así que una caña servida
en barra es 10% aunque esa misma botella en un supermercado sea 21%.

La columna existe para lo que se sale de ahí, que un bar también hace: botella cerrada que el
cliente se lleva sin descorchar, merchandising, entradas de espectáculo. Eso es venta, no
restauración, y va al 21%. Son pocos productos y los marca el propio local.

### Un tipo en la categoría, y el producto lo pisa si hace falta

La categoría lleva su tipo y el producto lo hereda. Si un producto concreto tributa distinto, lleva el
suyo y ese gana. `Product.taxRate` es **nullable**: vacío significa «el de mi categoría», que es lo
que permite cambiar una categoría entera de una vez.

Hubo un intento de meter tramos con nombre (`HOSPITALITY`, `ALCOHOL`, `RETAIL`) para que el motivo
quedara escrito. Se retiró, por dos razones:

- **Coaster ya no es solo de bares.** Una tienda de velas usa el fichaje y el stock sin comandas.
  Ponerle _hostelería_ a una vela es meter el vocabulario de un sector en algo compartido.
- **El tramo compraba menos de lo que parecía.** El tipo se copia en la fila del producto al
  importarlo, así que cambiar la tabla de tramos no tocaba los productos ya creados de ningún local.
  Solo habilitaba un «actualízame todos los marcados como alcohol», y eso es cambiarle a un negocio
  sus datos fiscales en masa: se avisa y lo revisa él.

Lo que sí se conserva de aquello: **puntos básicos enteros** (2100, nunca 21.0), por la misma razón
que el dinero son céntimos, y el tipo **congelado en la línea de comanda**.

### D. El registro de facturación

Una sola tabla para toda la cadena, incluidos los registros de anulación, porque comparten
secuencia, lock y función de verificación. Partirla en dos obligaría a coordinar dos correlativos.

```prisma
enum DbInvoiceRecordType {
  ALTA
  ANULACION

  @@map("InvoiceRecordType")
}

enum DbInvoiceType {
  F1  // ordinaria completa
  F2  // simplificada
  F3  // emitida en sustitución de facturas simplificadas (el canje)
  R1  // rectificativa: error fundado en derecho, art. 80.1/80.2/80.6 LIVA
  R2  // rectificativa: art. 80.3 (concurso)
  R3  // rectificativa: art. 80.4 (créditos incobrables)
  R4  // rectificativa: resto de causas
  R5  // rectificativa sobre facturas simplificadas

  @@map("InvoiceType")
}

enum DbRectificationType {
  S  // por sustitución
  I  // por diferencias

  @@map("RectificationType")
}

enum DbAeatStatus {
  NOT_SENT
  PENDING
  ACCEPTED
  ACCEPTED_WITH_ERRORS
  REJECTED

  @@map("AeatStatus")
}

model DbInvoice {
  id              String              @id @default(uuid())
  establishmentId String
  establishment   DbEstablishment     @relation(fields: [establishmentId], references: [id], onDelete: Restrict)
  orderId         String?
  order           DbOrder?            @relation(fields: [orderId], references: [id], onDelete: Restrict)

  idVersion       String              // IDVersion del esquema vigente al emitir
  recordType      DbInvoiceRecordType @default(ALTA)
  type            DbInvoiceType
  series          String
  number          Int
  sequence        BigInt

  issuerTaxId     String              // IDEmisorFactura
  issuerLegalName String              // NombreRazonEmisor
  issuerAddress   String

  operationText   String              // DescripcionOperacion · OBLIGATORIO
  externalRef     String?             // RefExterna · aquí va el orderId

  customerTaxId   String?             // NIF del destinatario
  customerName    String?             // NombreRazon
  customerAddress String?
  customerCountry String?             // IDOtro/CodigoPais si no es NIF español
  customerIdType  String?             // IDOtro/IDType

  simplifiedArt7273       Boolean     @default(false) // FacturaSimplificadaArt7273
  noCustomerIdArt61d      Boolean     @default(false) // FacturaSinIdentifDestinatarioArt61d
  macrodato               Boolean     @default(false) // Macrodato (> 100M €)
  issuedByThirdParty      String?     // EmitidaPorTerceroODestinatario: 'T' | 'D'
  thirdPartyTaxId         String?     // Tercero/NIF
  thirdPartyName          String?     // Tercero/NombreRazon

  taxLines        DbInvoiceTaxLine[]
  taxBaseTotal    Int
  taxAmountTotal  Int                 // CuotaTotal
  totalAmount     Int                 // ImporteTotal

  prevHash        String              // Encadenamiento/RegistroAnterior/Huella
  hash            String              // Huella
  hashType        String              @default("01") // TipoHuella: 01 = SHA-256
  prevSeries      String?
  prevNumber      Int?
  prevIssuedAt    DateTime?
  isFirstRecord   Boolean             @default(false) // Encadenamiento/PrimerRegistro

  softwareVersion     String          // SistemaInformatico/Version al emitir
  installationNumber  String          // SistemaInformatico/NumeroInstalacion

  qrPayload       String

  subsanacion     Boolean             @default(false) // reenvío tras corregir
  rechazoPrevio   Boolean             @default(false) // el anterior fue rechazado

  aeatStatus      DbAeatStatus        @default(NOT_SENT)
  aeatCsv         String?             // CSV · el SIF está obligado a conservarlo
  aeatRecordState String?             // EstadoRegistro
  aeatErrorCode   String?             // CodigoErrorRegistro
  aeatErrorText   String?             // DescripcionErrorRegistro
  aeatSentAt      DateTime?
  aeatAttempts    Int                 @default(0)

  substitutesId   String?             @unique
  substitutes     DbInvoice?          @relation("InvoiceSubstitution", fields: [substitutesId], references: [id], onDelete: Restrict)
  substitutedBy   DbInvoice?          @relation("InvoiceSubstitution")

  rectifiesId     String?             @unique
  rectifies       DbInvoice?          @relation("InvoiceRectification", fields: [rectifiesId], references: [id], onDelete: Restrict)
  rectifiedBy     DbInvoice?          @relation("InvoiceRectification")
  rectificationType   DbRectificationType? // TipoRectificativa
  rectifiedBase       Int?            // ImporteRectificacion/BaseRectificada
  rectifiedTaxAmount  Int?            // ImporteRectificacion/CuotaRectificada

  cancelsId       String?             @unique
  cancels         DbInvoice?          @relation("InvoiceCancellation", fields: [cancelsId], references: [id], onDelete: Restrict)
  cancelledBy     DbInvoice?          @relation("InvoiceCancellation")
  noPreviousRecord Boolean            @default(false) // SinRegistroPrevio
  generatedBy     String?             // GeneradoPor: 'E' | 'D' | 'T'

  issuedAt        DateTime            // FechaExpedicionFactura
  recordedAt      DateTime            // FechaHoraHusoGenRegistro · con huso
  operationDate   DateTime?           @db.Date // FechaOperacion
  createdAt       DateTime            @default(now())

  @@unique([establishmentId, series, number])
  @@unique([establishmentId, series, sequence])
  @@index([establishmentId, issuedAt])
  @@index([establishmentId, aeatStatus])
  @@index([orderId])
  @@map("Invoice")
}

model DbInvoiceTaxLine {
  id           String    @id @default(uuid())
  invoiceId    String
  invoice      DbInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  taxType      String    @default("01") // Impuesto: 01 = IVA
  regimeKey    String    @default("01") // ClaveRegimen: 01 = régimen general
  qualification String?  // CalificacionOperacion: S1 | S2 | N1 | N2
  exemption    String?   // OperacionExenta: E1..E6 · excluyente con qualification
  taxRate      Int       // TipoImpositivo, en puntos básicos
  taxBase      Int       // BaseImponibleOimporteNoSujeto
  taxAmount    Int       // CuotaRepercutida

  @@unique([invoiceId, taxRate, regimeKey])
  @@index([invoiceId])
  @@map("InvoiceTaxLine")
}
```

Decisiones que conviene entender antes de tocarlas:

- **`taxLines` es una tabla, no tres columnas.** Casi todos los tickets saldrán con una sola línea
  al 10%, pero basta con que alguien se lleve una botella cerrada (21%) junto a lo que ha consumido
  para que el mismo ticket tenga dos bases. Un `taxRate` escalar en la factura haría imposible ese
  ticket.
- **`prevSeries`, `prevNumber` y `prevIssuedAt` acompañan a `prevHash`.** `Encadenamiento` identifica
  la factura anterior por emisor, serie, fecha **y** huella, no solo por la huella.
- **`issuedAt` y `recordedAt` son campos distintos.** `FechaExpedicionFactura` es una fecha
  (dd-mm-yyyy) y `FechaHoraHusoGenRegistro` es un instante con huso horario. Casi siempre caen el
  mismo día, pero el XML pide los dos y uno de ellos entra en la huella.
- **`operationText` es obligatorio.** `DescripcionOperacion` no admite vacío. Para un bar es una
  constante razonable ("Consumiciones en establecimiento"), pero hay que persistirla: un reenvío
  tiene que reproducir el XML original byte a byte.
- **`idVersion`, `softwareVersion` e `installationNumber` se congelan en la factura.** El esquema y
  vuestra versión cambian con el tiempo; un registro reenviado dos años después debe salir con los
  valores que tenía al emitirse, no con los de hoy.
- **`aeatCsv` no es opcional.** La especificación dice expresamente que el CSV devuelto por la AEAT
  debe ser conservado por el sistema de facturación.
- **No hay tabla de pagos.** El repo cobra por cantidad de línea, no por apunte de caja, y eso ya
  resuelve la división de cuenta. Ver sección 5.

### E. Registro de acciones sobre comandas

`DbAdminAuditLog` es del backoffice de plataforma. Hace falta el equivalente a nivel de
establecimiento, con la misma forma:

```prisma
model DbOrderAuditLog {
  id              String          @id @default(uuid())
  establishmentId String
  establishment   DbEstablishment @relation(fields: [establishmentId], references: [id], onDelete: Cascade)
  actorId         String
  actor           DbUser          @relation(fields: [actorId], references: [id], onDelete: Restrict)
  action          String          // VOID_ORDER, VOID_ITEM, APPLY_DISCOUNT, REPRINT_TICKET
  targetType      String
  targetId        String
  reason          String?
  metadata        Json?
  createdAt       DateTime        @default(now())

  @@index([establishmentId, createdAt])
  @@index([targetType, targetId, createdAt])
  @@map("OrderAuditLog")
}
```

### F. El bloque `SistemaInformatico`

Va en **cada** registro y describe vuestro software, no al bar. Nueve campos: `NombreRazon` y `NIF`
del productor, `NombreSistemaInformatico`, `IdSistemaInformatico`, `Version`, `NumeroInstalacion`,
`TipoUsoPosibleSoloVerifactu`, `TipoUsoPosibleMultiOT` e `IndicadorMultiplesOT`.

Los siete primeros son constantes del producto y viven en configuración. Los dos que varían —
`Version` y `NumeroInstalacion`— se congelan en `DbInvoice` por la razón del punto anterior.
`NumeroInstalacion` identifica la instalación concreta: con un SaaS multiestablecimiento, decidid
pronto si es una por establecimiento y dejadlo escrito, porque cambia el significado de la cadena.

### G. Correspondencia con el XSD

Checklist para W9. Cada elemento de `RegistroAlta`, y de dónde sale:

| Elemento XSD                          | Obligatorio | De dónde sale                                    |
| ------------------------------------- | :---------: | ------------------------------------------------ |
| `IDVersion`                           |     sí      | `idVersion`                                      |
| `IDFactura/IDEmisorFactura`           |     sí      | `issuerTaxId`                                    |
| `IDFactura/NumSerieFactura`           |     sí      | `series` + `number`, con formato fijo            |
| `IDFactura/FechaExpedicionFactura`    |     sí      | `issuedAt`, formato `dd-mm-yyyy`                 |
| `RefExterna`                          |     no      | `externalRef` (el `orderId`)                     |
| `NombreRazonEmisor`                   |     sí      | `issuerLegalName`                                |
| `Subsanacion`                         |     no      | `subsanacion`                                    |
| `RechazoPrevio`                       |     no      | `rechazoPrevio`                                  |
| `TipoFactura`                         |     sí      | `type`                                           |
| `TipoRectificativa`                   | condicional | `rectificationType`                              |
| `FacturasRectificadas`                | condicional | vía `rectifiesId`                                |
| `FacturasSustituidas`                 | condicional | vía `substitutesId`                              |
| `ImporteRectificacion`                | condicional | `rectifiedBase`, `rectifiedTaxAmount`            |
| `FechaOperacion`                      |     no      | `operationDate`                                  |
| `DescripcionOperacion`                |   **sí**    | `operationText`                                  |
| `FacturaSimplificadaArt7273`          |     no      | `simplifiedArt7273`                              |
| `FacturaSinIdentifDestinatarioArt61d` |     no      | `noCustomerIdArt61d`                             |
| `Macrodato`                           |     no      | `macrodato`                                      |
| `EmitidaPorTerceroODestinatario`      |     no      | `issuedByThirdParty`                             |
| `Tercero`                             | condicional | `thirdPartyTaxId`, `thirdPartyName`              |
| `Destinatarios`                       | condicional | campos `customer*`                               |
| `Cupon`                               |     no      | no aplica                                        |
| `Desglose/DetalleDesglose`            |     sí      | `DbInvoiceTaxLine[]`                             |
| `CuotaTotal`                          |     sí      | `taxAmountTotal`                                 |
| `ImporteTotal`                        |     sí      | `totalAmount`                                    |
| `Encadenamiento`                      |     sí      | `isFirstRecord` o `prev*`                        |
| `SistemaInformatico`                  |     sí      | config + `softwareVersion`, `installationNumber` |
| `FechaHoraHusoGenRegistro`            |     sí      | `recordedAt`                                     |
| `TipoHuella`                          |     sí      | `hashType`                                       |
| `Huella`                              |     sí      | `hash`                                           |
| `Signature`                           |     no      | **no hace falta en Veri\*factu**                 |

Dos avisos sobre esta tabla:

- **"No obligatorio" en el XSD no significa que se pueda omitir.** `ClaveRegimen` y
  `CalificacionOperacion` son `minOccurs=0` en el esquema y sin embargo las reglas de validación los
  exigen para operaciones de IVA. El XSD marca el suelo; las validaciones publicadas marcan el
  techo, y son un documento aparte.
- **`Signature` es opcional**, lo cual confirma que en remisión Veri*factu no hace falta firmar el
  XML con XAdES. Eso se lo ahorra el proyecto entero.

Para `RegistroAnulacion` la lista es más corta: `IDVersion`, `IDFactura` (la que se anula),
`RefExterna`, `SinRegistroPrevio`, `RechazoPrevio`, `GeneradoPor`, `Generador`, `Encadenamiento`,
`SistemaInformatico`, `FechaHoraHusoGenRegistro`, `TipoHuella` y `Huella`. Cubierta por
`noPreviousRecord`, `generatedBy` y los campos comunes.

## 3. IVA: desglose y prorrateo

**Los precios del catálogo son la base imponible, sin IVA.** El IVA se suma encima, que es como se
factura de forma estándar y lo que permite que una factura cuadre sin ingeniería inversa: la base es
un dato, no un resultado de dividir.

Se hizo así tras probar lo contrario. La primera versión guardaba el precio con el IVA dentro y lo
extraía —cómodo para la carta de un bar, donde el cliente paga lo que pone— pero convierte la base en
un cociente redondeado y arrastra ese redondeo a cada línea de la factura. Con la plataforma todavía
en beta cerrada se migraron los precios existentes dividiendo, y quedó cerrado.

La contrapartida, que conviene conocer: **no todo precio final es alcanzable**. Al 10%, una base de
0,94 € da 1,03 € y una de 0,95 € da 1,05 €; 1,04 € no se puede expresar. De 152 productos migrados,
132 volvieron al céntimo exacto y 20 se movieron uno.

El cálculo va dentro de `OrderPricingEngine`, que ya es el único calculador y lo usan las dos partes.
No se escribe un motor nuevo al lado.

### A. De base a cuota

Para cada tipo, sobre la base ya descontada:

```text
cuota = round(baseDelTipo * taxRate / 10000)
total = baseDelTipo + cuota
```

**Una sola cuota por tipo, sobre la base sumada**, nunca línea a línea y luego sumadas: siete líneas
de 0,33 € al 21% dan 0,49 € de cuota, no siete redondeos de 0,07 € que darían 0,49 € por casualidad y
otra cifra en cuanto cambie una cantidad.

### B. Descuentos

Los descuentos se aplican **sobre la base y luego se grava lo que queda**, nunca al revés. Los de
línea ya salen resueltos: `PricingItemOutput.finalTotal` viene con el descuento aplicado y esa línea
tiene un único tipo, así que se agrupa y ya está.

Los descuentos de comanda (`target: ORDER`) son el trabajo real: rebajan el conjunto y hay que
repartirlos entre tipos **en proporción al peso de cada tipo** en la base sobre la que se aplican.
El céntimo que sobra del reparto se asigna al tipo de mayor importe, de forma determinista, para que
dos cálculos de la misma comanda den siempre lo mismo.

### C. La propina no lleva IVA

`tipAmount` queda fuera de la base imponible y fuera del total de la factura. Se cobra, se contabiliza
en el arqueo, pero no es contraprestación de la entrega.

### D. Los códigos que acompañan a cada línea

Cada `DetalleDesglose` no lleva solo tipo, base y cuota. Lleva también `ClaveRegimen`
(`01` = régimen general, que es lo que aplica a un bar) y `CalificacionOperacion` (`S1` = sujeta y no
exenta, sin inversión del sujeto pasivo). Ambos son `minOccurs=0` en el esquema y aun así las
validaciones los exigen para IVA: dejarlos fuera es rechazo garantizado.

Son constantes para el caso normal, pero se persisten por línea en vez de asumirse, porque el día que
aparezca una exención o un régimen distinto no habrá que migrar facturas ya emitidas.

Este paquete es funciones puras con tests de tabla. Es el único que no delegaría sin revisar.

### Lo construido, y una decisión que conviene no deshacer

`OrderPricingEngine` devuelve ahora `taxBreakdown` (una línea por tipo, con `regimeKey` y
`qualification` persistidos por línea), `taxBaseTotal` y `taxAmountTotal`. La línea de comanda lleva
su tipo en `taxRateAtPurchase`, así que el desglose se calcula sobre el tipo **congelado en la
venta**, no sobre el que el producto tenga hoy.

Los tests fijan lo que importa: base y cuota suman siempre el bruto al céntimo, la propina queda
fuera, un descuento de comanda se reparte en proporción, el céntimo sobrante va al tipo más pesado, y
el resultado no depende del orden de las líneas.

El tipo efectivo de una línea se resuelve con `resolveTaxRate(producto, categoría)` en el momento de
la venta y se congela en `taxRateAtPurchase`. Reclasificar un producto, o cambiar el IVA de su
categoría, no toca ningún ticket ya emitido.

## 4. Huella encadenada y numeración

Copia directa de [`time-entry-chain.ts`](apps/api/src/time-tracking/domain/time-entry-chain.ts), con
tres cambios:

1. **El lock va por serie**, no solo por establecimiento:
   `pg_advisory_xact_lock(hashtext(establishmentId || ':' || series))`. Cada serie lleva su propio
   correlativo y dos series no deben bloquearse entre sí.
2. **Dos contadores**, no uno. `sequence` es la posición en la cadena; `number` es el número de
   factura que ve el cliente. Coinciden mientras nada se anule, pero conceptualmente son distintos y
   el registro de anulación consume `sequence` sin consumir `number`.
3. **La cadena canónica sale del XSD**, no de este documento.

Sobre el punto 3, en serio: la cadena canónica es la única parte de todo esto que no admite
aproximación. Un separador de más, un formato de fecha distinto o un orden de campos alterado y la
AEAT rechaza **todos** los registros, no uno. La forma es esta —

```text
IDEmisorFactura=B12345678&NumSerieFactura=VF26-0042&FechaExpedicionFactura=25-08-2026&...&Huella=HEX_ANTERIOR
```

— pero los campos exactos, su orden y el tratamiento del primer registro de la serie se copian del
esquema oficial vigente y se fijan con un test de vector conocido antes de construir nada encima.

El resultado es hexadecimal en mayúsculas. El primer registro de una serie va con la huella anterior
vacía; en base de datos se guarda el `GENESIS_HASH` de sesenta y cuatro ceros que ya usa
`time-entry-chain`, para no tener que distinguir nulos al verificar.

## 5. De la comanda a la factura

```text
                          [ COMANDA ABIERTA ]
                     sin número, sin huella, sin factura
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
  [ Cobro parcial: 3 cañas ]                        [ Cobro parcial: resto ]
   paidQuantityCard += 3                             paidQuantityCash += n
           │                                                   │
           └─────────────────────────┬─────────────────────────┘
                                     │
                          [ pendingAmount === 0 ]
                                     │
                                     ▼
                    [ CIERRE FISCAL · transacción atómica ]
              1. advisory lock por (establecimiento, serie)
              2. leer cabeza de la cadena
              3. desglosar IVA con OrderPricingEngine
              4. asignar number y sequence
              5. calcular huella encadenada
              6. escribir DbInvoice + DbInvoiceTaxLine
              7. construir el payload del QR
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
          [ Ticket térmico ]                [ Reimpresión / PDF ]
           payload desde la API              desde DbInvoice
           (0 llamadas a la AEAT)            (0 llamadas a la AEAT)
                                     │
                                     ▼
                       [ Despacho a la AEAT · asíncrono ]
```

Reglas:

1. **Comanda abierta.** No hay factura, no hay huella, no hay número. Lo que se imprime aquí es una
   nota de consumo, no un documento fiscal, y debe decirlo.
2. **Cobros parciales.** El estado vive en `paidQuantity` por línea; `DbPaymentStatus` ya distingue
   `PENDING`, `PARTIAL` y `PAID` sin necesidad de un estado nuevo en la comanda.
3. **Cierre.** Al llegar el pendiente a cero se emite **una única factura simplificada F2** por el
   total consolidado.
4. **División de cuenta.** Si los clientes quieren tickets independientes, cada cobro parcial emite
   su propia F2 con su número y su huella. El modelo por cantidad de línea ya soporta esto; lo que
   falta es que el cobro parcial, y no solo el cierre, pueda disparar una emisión.

La concurrencia del cierre ya está resuelta en
[`orders.write.repository.ts`](apps/api/src/orders/data-access/orders.write.repository.ts): el
checkout reclama la comanda con un `updateMany ... where status = 'OPEN'` y el cobro parcial toma un
`SELECT ... FOR UPDATE`. La emisión entra en esa misma transacción, no en una posterior.

## 6. Tipos de factura y correcciones

| Tipo | Uso                                               | Datos del cliente             |
| ---- | ------------------------------------------------- | ----------------------------- |
| `F2` | Simplificada. El 99% de la barra y las mesas.     | Ninguno                       |
| `F1` | Ordinaria. Cuando una empresa o autónomo la pide. | NIF, razón social, domicilio  |
| `R1` | Rectificativa por error fundado en derecho.       | Los de la factura rectificada |
| `R2` | Rectificativa por el resto de causas.             | Los de la factura rectificada |

**Regla que gobierna las tres correcciones: un registro emitido no se modifica jamás.** Se emite uno
nuevo que lo referencia. Es el mismo principio que `supersedesId` en `DbTimeEntry`.

### A. F1 directa

Interruptor "factura a empresa" en el cobro, modal con NIF, razón social y domicilio, y el cierre
emite `type: F1` en vez de `F2`. Nada más cambia.

### B. Canje: el cliente vuelve con un ticket F2

Ojo aquí, porque es el error fácil: **el canje es `F3`, no `F1`.** `F3` es exactamente "factura
emitida en sustitución de facturas simplificadas". Una `F1` es una ordinaria que nace ordinaria.

1. Se localiza la F2 original y se comprueba que `substitutedBy` está vacío.
2. Se emite una **F3 nueva**, con su propio número y la fecha de hoy.
3. El XML rellena `FacturasSustituidas` referenciando emisor, serie y fecha de la F2.
4. Se enlaza `substitutesId` en la nueva. La original no se toca.

### C. Rectificativa

Cuando lo emitido está mal —importe equivocado, producto que no era, devolución— se emite una
rectificativa que referencia la original vía `rectifiesId`. La original sigue en la cadena, intacta.

Dos cosas que hay que decidir en cada rectificativa y que no son lo mismo:

- **Qué tipo.** `R1` a `R4` rectifican facturas ordinarias según la causa; **`R5` es la que rectifica
  facturas simplificadas**, que es el caso normal de un bar.
- **`TipoRectificativa`**, que es un eje distinto: `S` por sustitución (la nueva reemplaza el
  importe íntegro) o `I` por diferencias (la nueva lleva solo el delta). Si es por sustitución hay
  que informar además `ImporteRectificacion` con la base y la cuota **rectificadas**, es decir las
  de la factura original, no las nuevas.

### D. Anulación

Cuando la factura no debió existir, se escribe una fila con `recordType: ANULACION` que apunta a la
original con `cancelsId`. Consume `sequence` y huella, no consume `number`, y se envía a la AEAT como
registro de anulación. No confundir con la sección 9: **esto solo aplica a facturas ya emitidas**.

## 7. Impresión y PDF

### A. El payload se construye en el servidor

Hoy `PrintTicket` en web monta el ticket en el navegador y lo manda a imprimir. Un ticket fiscal no
puede salir de ahí: número, huella y QR se calculan en servidor o no valen nada. La construcción se
mueve a la API y `PrintTicketDto` crece con desglose por tipo, serie y número, huella y payload del
QR. El navegador pasa a pedir "imprime la factura X".

### B. El pie del ticket fiscal

1. Desglose de bases y cuotas, una línea por tipo de IVA.
2. Código QR de cotejo.
3. Leyenda de verificación en la sede electrónica y la marca `VERI*FACTU`.
4. Huella, completa o sus primeros caracteres.

La URL del QR y sus parámetros se copian de la especificación oficial vigente, igual que la cadena
canónica.

### C. QR en la impresora

El renderer de `apps/printer-service` es solo texto: no tiene ni QR ni imagen. Hay que implementar
el juego de comandos `GS ( k` en Go, con sus tests, y desplegarlo a los equipos ya instalados. El
updater existe, pero es un ciclo de release sobre hardware que está en los locales, así que conviene
que salga pronto y no el último día.

### D. Reimpresión y PDF

Se generan desde `DbInvoice`. **Ni la reimpresión ni el PDF llaman a la AEAT.** Una reimpresión sí
deja rastro en `DbOrderAuditLog`.

## 8. Envío a la AEAT

### A. El interruptor

```text
[ Cierre de comanda ]
          │
   ¿verifactuEnabled?
    ├── NO · modo clásico
    │     ticket estándar, sin QR ni huella, 0 llamadas a la AEAT
    │
    └── SÍ · modo oficial
          emisión de la sección 5 + despacho asíncrono
```

Al encender el interruptor por primera vez se arranca **serie nueva** (`VF26-` frente a la anterior),
para que la trazabilidad histórica quede separada y la cadena empiece limpia. Estando en beta cerrada
esto sale gratis: no hay histórico que migrar.

El flag no se puede encender sin los tres campos fiscales de la sección 2.A.

### B. Lo que se puede hacer sin certificado

Casi todo. El constructor del XML se escribe y se valida contra el XSD oficial en local, con tests
sobre facturas de ejemplo. Esto saca la integración del camino crítico.

### C. Lo que necesita certificado

El transporte: SOAP sobre HTTPS con certificado de cliente X.509. No hace falta firmar el XML: en
remisión Veri*factu el nodo `Signature` es opcional y el certificado del canal ya autentica.

Dos vías, y hay que elegir pronto porque cambian el modelo de datos y el de negocio:

- **Certificado del cliente final.** Cada bar sube el suyo. Obliga a custodiarlos cifrados, con KMS,
  avisos de caducidad y un procedimiento de rotación.
- **Colaborador social.** Presentáis en nombre de los bares con vuestro certificado. Menos custodia,
  pero es un trámite administrativo con sus propias obligaciones.

### D. Dónde corre el despacho

`TODO.md` ya lo advierte para otra cosa y aquí importa igual: Cloud Run para el contenedor cuando no
hay tráfico, así que **un cron en proceso no dispara nunca**. El despacho necesita Cloud Tasks o
Scheduler golpeando un endpoint. La máquina de estados de `aeatStatus` cubre el reintento con
retroceso exponencial, el rechazo y el aviso cuando algo lleva demasiado tiempo sin aceptarse.

Tres cosas de la respuesta que no son opcionales:

- **El `CSV`.** La AEAT devuelve un código seguro de verificación por envío y **el sistema de
  facturación está obligado a conservarlo**. Va en `aeatCsv`.
- **`TiempoEsperaEnvio`.** La respuesta indica cuántos segundos hay que esperar antes del siguiente
  envío. No es una sugerencia: el despachador tiene que guardarlo y respetarlo, o acabáis limitados.
  Es estado del emisor, no de la factura, así que vive fuera de `DbInvoice`.
- **Rechazo y reenvío.** Cuando un registro se rechaza se corrige y se reenvía con `Subsanacion` y
  `RechazoPrevio` marcados. Sin esos flags el reenvío se trata como un alta nueva y se duplica.

Que una factura tarde en enviarse no bloquea al cliente: el ticket ya está impreso y la huella ya
está calculada. Lo que no puede pasar es que un rechazo se quede en silencio.

## 9. Comandas que nunca se cobran

Si una comanda abierta no llega a cobrarse **no se genera factura, no se calcula huella y no se envía
nada a la AEAT**. Aquí no hay nada que anular porque nunca hubo nada emitido.

```text
                                [ COMANDA ABIERTA ]
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
 [ IMPAGO / "SIMPA" ]            [ ERROR DE COMANDA ]           [ INVITACIÓN ]
   motivo obligatorio              motivo obligatorio             total 0,00 €
   0 facturas                      0 facturas                     0 facturas
   → DbOrderAuditLog               → DbOrderAuditLog              → DbOrderAuditLog
```

`DbOrderStatus` es hoy `OPEN | CLOSED | CANCELLED`. En vez de multiplicar estados, `CANCELLED` se
queda y el motivo vive en el registro de auditoría, que es donde se puede consultar y auditar.
Motivos: `UNPAID_CUSTOMER`, `DUPLICATE_ORDER`, `STAFF_ERROR`, `WASTE`, `COMPLIMENTARY`.

Control antifraude: anular líneas o mesas con consumiciones exige PIN de encargado o administrador,
motivo obligatorio y registro automático. El PIN no existe todavía; el sistema de roles sí.

## 10. Cierre de caja

Al ejecutar el cierre diario:

1. Se comprueba si quedan comandas abiertas o parcialmente cobradas.
2. Si las hay, el cierre se bloquea y exige liquidarlas o anularlas con motivo.
3. El informe totaliza por método de pago, y en modo Veri*factu añade el rango de números emitidos,
   el desglose por tipo de IVA y cuántas facturas siguen sin aceptar en la AEAT.

Este último dato es el que convierte el arqueo en la red de seguridad del despacho asíncrono.

## 11. Cobros tardíos

Está prohibido registrar facturas con fecha pasada. Si una comanda se cobra con días de retraso se
usan dos fechas:

- **`issuedAt`** — el momento real en que se cobra y se calcula la huella.
- **`operationDate`** — el día en que se consumió. Solo se informa si difiere de la anterior.

| Escenario                           | Tratamiento                                         | Implicación                                      |
| ----------------------------------- | --------------------------------------------------- | ------------------------------------------------ |
| Cobro olvidado dentro del trimestre | `issuedAt` = hoy                                    | El IVA se liquida en el 303 en curso             |
| Cobro olvidado cruzando trimestre   | `issuedAt` = hoy, `operationDate` = día del consumo | Permite imputar el devengo al trimestre correcto |

## 12. Ventas a crédito

Se factura el día del consumo, F2 o F1, y el cobro se registra como crédito de cliente. Cuando el
cliente salda semanas después, eso es **un movimiento de tesorería y nada más**: no se toca
`DbInvoice`, no se emite nada nuevo y no se calcula ninguna huella.

## 13. Obligaciones que no se resuelven programando

Como fabricante del software pasáis a tener obligaciones propias, no solo el bar. Declaración
responsable, vuestro NIF y los datos del sistema informático en cada registro, y las
responsabilidades que eso conlleva. Corre en paralelo al código y conviene empezarlo pronto, porque
no depende de vosotros terminarlo.

Las fechas de obligatoriedad que apliquen a este caso hay que confirmarlas con la normativa vigente:
se han movido varias veces.

## 14. Paquetes de trabajo

```text
                        [ W0 · Schema + identidad fiscal ]
                                      │
        ┌──────────┬──────────┬───────┴───────┬──────────┬──────────┐
        ▼          ▼          ▼               ▼          ▼          ▼
     [ W1 ]     [ W2 ]     [ W4 ]          [ W5 ]     [ W6 ]     [ W9 ]
      IVA       cadena     QR en Go       anulacs.    arqueo Z   XML+XSD
        └──────────┘                                                │
             ▼                                                      │
          [ W3 ] ticket en servidor                                 │
             │                                                      │
        ┌────┴────┐                                                 │
        ▼         ▼                                                 ▼
     [ W7 ]    [ W8 ]                                           [ W10 ]
    F1+canje    PDF                                          SOAP + mTLS
    rectific.                                          ← bloqueado por certificado
```

| #   | Paquete                                                                                                                     | Depende de       | Notas                                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| W0  | ~~Migración única: identidad fiscal, `taxRate`, `DbInvoice`, `DbInvoiceTaxLine`, `DbOrderAuditLog`~~ **Hecho** (2026-08-25) | —                | Salió entera, más `icon` en `DbProduct` y `productNameAtPurchase` en `DbOrderItem`. El backfill del nombre va dentro de la migración. |
| W1  | ~~Desglose de IVA y prorrateo en `OrderPricingEngine`, más el IVA editable en categoría y producto~~ **Hecho** (2026-08-25) | W0               | Sección 3. Funciones puras, con tests de tabla. El tipo vive en la categoría y el producto lo pisa si hace falta.                     |
| W2  | Cadena de huellas y correlativo por serie                                                                                   | W0               | Sección 4. Calca `time-entry-chain`.                                                                                                  |
| W3  | Construcción del ticket en la API                                                                                           | W1, W2           | Sección 7.A.                                                                                                                          |
| W4  | `GS ( k` en el renderer Go                                                                                                  | —                | Sección 7.C. Otro lenguaje, aislado del resto.                                                                                        |
| W5  | Anulación de comandas: PIN, motivo, auditoría                                                                               | W0               | Sección 9.                                                                                                                            |
| W6  | Cierre de caja                                                                                                              | W0, W1           | Sección 10.                                                                                                                           |
| W7  | F1 directa, canje, rectificativas, anulación fiscal                                                                         | W2               | Sección 6.                                                                                                                            |
| W8  | PDF desde `DbInvoice`                                                                                                       | W2               | Sección 7.D.                                                                                                                          |
| W9  | Constructor de XML validado contra XSD y contra las validaciones publicadas                                                 | W1, W2           | Secciones 2.G, 8.B y 15. **Sin certificado.**                                                                                         |
| W10 | Transporte SOAP, mTLS, despacho y reintentos                                                                                | W9 + certificado | Sección 8.C y 8.D.                                                                                                                    |

W1, W2, W4, W5, W6 y W9 arrancan a la vez en cuanto W0 esté en `main`. No comparten ficheros.

Todo lo que hay entre W0 y W8 tiene valor por sí solo aunque Veri*factu no llegara nunca: desglose
de IVA en el ticket, número de factura, QR, PDF, arqueo y trazabilidad de anulaciones. Solo W9 y W10
son específicos de la AEAT.

## 15. Fuentes

Los tres documentos que mandan sobre este. Si algo de aquí los contradice, ganan ellos:

- [Esquemas de los servicios web](https://www.agenciatributaria.es/AEAT.desarrolladores/Desarrolladores/_menu_/Documentacion/Sistemas_Informaticos_de_Facturacion_y_Sistemas_VERI_FACTU/Esquemas_de_los_servicios_web/Esquemas_de_los_servicios_web.html)
  — de aquí salen `SuministroInformacion.xsd` (tipos comunes, donde está `RegistroAlta`) y
  `SuministroLR.xsd`. Descargadlos al repo y validad contra ellos en CI: es lo que convierte W9 en
  trabajo verificable sin certificado.
- [Descripción del servicio web](https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_Descripcion_SWeb.pdf)
  — estructura de la petición y de la respuesta, y los ejemplos completos de sobre SOAP.
- [Validaciones y errores](https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf)
  — **el que de verdad decide si un registro entra.** El XSD marca lo que es sintácticamente válido;
  este marca lo que se acepta. Los campos que el esquema da por opcionales y que en realidad son
  obligatorios están aquí.
- [Contenido del registro de alta](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/cuestiones-generales/contenido-registro-facturacion-alta_.html)
  — la lista normativa en prosa, útil para contrastar que no falta nada de fondo.

Hay además un `EventosSIF.xsd` para registros de evento. Queda por comprobar si aplica a remisión
Veri*factu o solo a sistemas no verificables; si aplicara, es un paquete más.
