# Guía Técnica y Normativa: Sistema de Facturación y Veri*factu para TPV SaaS

## 1. Comunicación con la AEAT: Identificación, Formato y Certificados

Para que la Agencia Tributaria identifique al emisor, al software y valide la información, la integración se realiza en tres capas:

### A. Identificación y Autenticación

1. **Conexión (mTLS con Certificado X.509):** La llamada al Web Service de la AEAT se autentica mediante HTTPS con certificado de cliente. Puede ser:

- El certificado digital del cliente final (obligado tributario).
- El certificado de tu empresa SaaS si actúas como **colaborador social / apoderado** para presentar en nombre de los bares.

2. **Cuerpo del mensaje (Payload XML):** Dentro de la estructura XML se identifican explícitamente el emisor y el desarrollador.

### B. Formato de datos obligatorio

- **Protocolo:** Web Service **SOAP** sobre HTTPS con llamadas síncronas.
- **Formato:** **XML estructurado** validado contra el esquema oficial XSD de la AEAT (`SuministroLR.xsd` / `RegistroFacturacionAlta`).
- **Nodos principales del XML:**
- **`Cabecera`:** NIF y Razón Social del obligado tributario y tipo de comunicación.
- **`SistemaInformatico`:** NIF del desarrollador, nombre del SaaS, versión comercial e ID de instalación.
- **`RegistroFactura`:** Serie, número correlativo, timestamp ISO con huso horario, tipo de factura (`F1`/`F2`), desglose de bases e IVA, huella anterior y huella actual.

## 2. Algoritmo Criptográfico: Hash SHA-256 y Encadenamiento

```text
[ Invoice N-1 ] ──► SHA-256 (Previous Hash)
                          │
                          ▼
[ Invoice N ]   ──► Canonical string + Previous Hash ──► SHA-256 (Current Hash)
                          │
                          ▼
[ Invoice N+1 ] ──► Canonical string + Current Hash  ──► SHA-256 (Next Hash)

```

### A. Cadena canónica para el cálculo de la huella

Se concatenan los campos normalizados en orden estricto, separados por `&`, en UTF-8 y sin espacios:

```text
IDEmisorFactura=B12345678&NumSerieFactura=T2026-0042&FechaExpedicionFactura=25-08-2026&TipoFactura=F2&CuotaTotal=1.20&ImporteTotal=13.20&Huella=PREVIOUS_HEX_HASH&FechaHoraHusoGenRegistro=2026-08-25T14:30:00+02:00

```

_Si es el primer registro de una serie, el parámetro `Huella` se envía vacío (`Huella=&`)._

### B. Generación del Hash

Se aplica `SHA-256` sobre la cadena resultante. El resultado es un string hexadecimal de 64 caracteres en mayúsculas (ej. `3A7F92B...C81`).

### C. Código QR impreso

Cada factura simplificada u ordinaria incluye un código QR con la URL de cotejo de la AEAT:

```text
https://sede.agenciatributaria.gob.es/verifactu/consulta?nif=B12345678&numserie=T2026-0042&fecha=25-08-2026&importe=13.20&huella=3A7F92B5

```

## 3. Arquitectura del TPV: Comandas, Cobros Parciales y Facturación

Separar la **gestión de cobros de caja** de la **emisión de la factura fiscal** evita problemas de redondeo en el IVA y simplifica el encadenamiento.

```text
                          [ OPEN ORDER / TABLE ]
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
[ Partial Payment 1: 20€ Card ]                     [ Partial Payment 2: 15€ Cash ]
(Saves internal payment record)                     (Saves internal payment record)
           │                                                   │
           └─────────────────────────┬─────────────────────────┘
                                     │
                         [ PENDING BALANCE = 0.00 € ]
                                     │
                                     ▼
                      [ FISCAL CLOSURE (Atomic DB Tx) ]
                     1. Assign sequential invoice number
                     2. Fetch last hash for tenant/series
                     3. Compute new SHA-256 hash
                     4. Save record in `invoices` table
                     5. Dispatch XML to AEAT (Background Job)
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
         [ Thermal Printer ]               [ Reprint / PDF Export ]
          Send ESC/POS to printer          Generate PDF from DB
          (0 requests to AEAT)             (0 requests to AEAT)

```

### Reglas de negocio:

1. **Comanda abierta (`status: OPEN`):** Los camareros añaden o modifican consumiciones. No hay factura, no hay hash, no hay número correlativo.
2. **Cobros parciales (`status: PARTIALLY_PAID`):** Los pagos de 10 €, 20 €, etc., se guardan en la tabla `payments` vinculados a la comanda.
3. **Cierre de comanda (`status: CLOSED`):** Al llegar el saldo pendiente a 0 €, una transacción atómica emite **una única Factura Simplificada (`F2`)** por el total consolidado.
4. **División de cuenta (_Split Bill_ estricto):** Si los clientes exigen tickets fiscales independientes, el sistema emite $N$ facturas simplificadas (`F2`), cada una con su número correlativo y su hash encadenado.

## 4. Tipos de Factura y Flujo de Canje / Sustitución

| Tipo     | Denominación                 | Uso                                                                    | Datos requeridos del cliente                       |
| -------- | ---------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------- |
| **`F2`** | Factura Simplificada         | El 99% de las ventas en barra/mesa (tickets estándar).                 | Ninguno. Solo datos del establecimiento emisor.    |
| **`F1`** | Factura Ordinaria (Completa) | Cuando una empresa o autónomo solicita factura con sus datos fiscales. | NIF/CIF, Nombre o Razón Social y Domicilio Fiscal. |

### A. Emisión directa de `F1` (En el cobro)

1. El camarero activa el toggle _"Factura a empresa"_ en el TPV.
2. Introduce NIF, Razón Social y Dirección en el modal.
3. El backend genera directamente un registro `invoice_type: 'F1'`, calcula su hash y despacha a la AEAT.

### B. Canje posterior (El cliente vuelve días después con un ticket `F2`)

- **Regla de inmutabilidad:** No se puede modificar el registro `F2` original en la base de datos para no romper la cadena criptográfica ya generada.
- **Procedimiento:**

1. El sistema busca el ticket original `F2` en la base de datos.
2. Verifica que `is_substituted == false` para evitar duplicidades.
3. Genera un **nuevo registro `F1**` con nuevo número de serie y fecha actual.
4. En el XML de Veri*factu se cumplimenta el nodo `FacturasSustituidas` referenciando el número y serie del ticket `F2`.
5. Se calcula el nuevo hash encadenado y se envía a la AEAT.
6. En la base de datos se actualiza el ticket original: `is_substituted = true` y `substituted_by_invoice_id = new_invoice.id`.

## 5. Impresión en Papel Térmico y Generación de PDF

- **Impresión Térmica (ESC/POS):**
- Se imprime directamente en papel continuo de 80mm o 58mm.
- El pie del ticket incluye:

1. Desglose de Bases Imponibles e importes de IVA.
2. Código QR generado mediante comandos nativos ESC/POS.
3. Leyenda: `"Factura verificable en la sede electrónica de la AEAT"` y texto `"VERI*FACTU"`.
4. Huella SHA-256 (completa o primeros/últimos caracteres).

- **Descarga de PDF / Envío por Email:**
- Se genera al vuelo en el servidor a partir de los datos almacenados en la tabla `invoices`.
- **Reimprimir un ticket o descargar el PDF no genera ninguna llamada a la AEAT.**

## 6. Estrategia de Feature Flag (Modo Clásico vs. Modo Veri*factu)

El SaaS puede operar bajo un interruptor de configuración por cliente (`tenant_settings.is_verifactu_enabled`):

```text
[ Process Payment / Close Order ]
                │
                ▼
  ¿is_verifactu_enabled == TRUE?
   ├── NO (Legacy / Classic Mode):
   │     1. Assign classic sequential ticket number
   │     2. Persist order and payments in DB
   │     3. Print standard thermal receipt (No AEAT QR / No SHA-256)
   │     4. [END] (0 hashes computed, 0 requests to AEAT)
   │
   └── SÍ (Official Veri*factu Mode):
         1. Open atomic DB transaction
         2. Assign Veri*factu series correlative number
         3. Fetch last hash for tenant & series
         4. Build canonical string and compute SHA-256
         5. Persist immutable record in `invoices` table
         6. Generate official AEAT QR payload
         7. Print receipt with "VERI*FACTU" badge & QR
         8. Dispatch XML to AEAT SOAP Web Service

```

### Reglas de activación inicial (_Genesis Record_):

- **Primera factura de la serie:** Al no existir hash previo, el parámetro `Huella` se deja vacío en la cadena canónica (`Huella=&`) y el XML omite la referencia previa.
- **Series diferenciadas:** Al activar Veri*factu por primera vez, se recomienda iniciar una serie nueva (ej. `VF26-` en lugar de `T-`) para mantener separada la trazabilidad histórica.

## 7. Modelo de Datos Relacional (PostgreSQL Schema)

```text
Table: tenants
  - id: UUID (PK)
  - business_name: VARCHAR(255)
  - tax_id: VARCHAR(20)
  - address: TEXT
  - is_verifactu_enabled: BOOLEAN DEFAULT FALSE
  - created_at: TIMESTAMPTZ

Table: orders
  - id: UUID (PK)
  - tenant_id: UUID (FK -> tenants.id)
  - table_number: VARCHAR(50)
  - status: VARCHAR(30) -- 'OPEN', 'PARTIALLY_PAID', 'CLOSED', 'VOIDED_UNPAID', 'VOIDED_ERROR', 'COMPLIMENTARY'
  - subtotal_amount: DECIMAL(10,2)
  - tax_amount: DECIMAL(10,2)
  - total_amount: DECIMAL(10,2)
  - closed_at: TIMESTAMPTZ
  - created_at: TIMESTAMPTZ

Table: order_items
  - id: UUID (PK)
  - order_id: UUID (FK -> orders.id)
  - product_name: VARCHAR(255)
  - quantity: INTEGER
  - unit_price: DECIMAL(10,2)
  - tax_rate: DECIMAL(5,2) -- e.g. 10.00
  - total_price: DECIMAL(10,2)

Table: payments
  - id: UUID (PK)
  - order_id: UUID (FK -> orders.id)
  - tenant_id: UUID (FK -> tenants.id)
  - payment_method: VARCHAR(30) -- 'CASH', 'CREDIT_CARD', 'BIZUM', 'CUSTOMER_CREDIT'
  - amount: DECIMAL(10,2)
  - status: VARCHAR(30) -- 'COMPLETED', 'REFUNDED'
  - created_at: TIMESTAMPTZ

Table: invoices
  - id: UUID (PK)
  - tenant_id: UUID (FK -> tenants.id)
  - order_id: UUID (FK -> orders.id, NULLABLE for external replacements)
  - issuer_tax_id: VARCHAR(20)
  - series: VARCHAR(20)
  - invoice_number: INTEGER
  - invoice_type: VARCHAR(10) -- 'F1', 'F2', 'R1', 'R2'
  - customer_tax_id: VARCHAR(20) NULLABLE
  - customer_name: VARCHAR(255) NULLABLE
  - customer_address: TEXT NULLABLE
  - tax_base: DECIMAL(10,2)
  - tax_rate: DECIMAL(5,2)
  - tax_amount: DECIMAL(10,2)
  - total_amount: DECIMAL(10,2)
  - previous_hash: VARCHAR(64) NULLABLE
  - current_hash: VARCHAR(64) -- SHA-256 Hex
  - qr_payload: TEXT
  - is_verifactu: BOOLEAN DEFAULT TRUE
  - aeat_status: VARCHAR(30) -- 'NOT_SENT', 'PENDING', 'ACCEPTED', 'REJECTED'
  - aeat_response_code: VARCHAR(50) NULLABLE
  - is_substituted: BOOLEAN DEFAULT FALSE
  - substituted_by_invoice_id: UUID (FK -> invoices.id, NULLABLE)
  - issued_at: TIMESTAMPTZ
  - operation_date: DATE NULLABLE
  - created_at: TIMESTAMPTZ

Table: audit_logs
  - id: UUID (PK)
  - tenant_id: UUID (FK -> tenants.id)
  - user_id: UUID
  - action: VARCHAR(50) -- 'VOID_ORDER', 'VOID_ITEM', 'APPLY_DISCOUNT', 'DRAWER_OPENED'
  - entity_type: VARCHAR(50) -- 'orders', 'order_items', 'invoices'
  - entity_id: UUID
  - reason: TEXT
  - metadata: JSONB
  - created_at: TIMESTAMPTZ

```

## 8. Gestión de Cobros Tardíos y Desfase Temporal de Fechas

Está prohibido registrar facturas con timestamps pasados. Si una comanda se cobra con días de retraso, se emplean dos fechas en el XML:

- **`FechaExpedicionFactura` (`issued_at`):** Timestamp exacto del momento en que se procesa el cobro y se calcula el SHA-256 (ej. `2026-09-15T12:00:00+02:00`).
- **`FechaOperacion` (`operation_date`):** Fecha en que se realizó el consumo en el bar (ej. `2026-09-01`). Solo se incluye si difiere de la fecha de expedición.

| Escenario                                | Tratamiento en el Backend                                             | Implicación Fiscal                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Cobro olvidado en el mismo trimestre** | `issued_at` = fecha actual, calcula hash.                             | El IVA se liquida en el modelo 303 en curso.                                                |
| **Cobro olvidado cruzando trimestre**    | `issued_at` = fecha actual, `operation_date` = fecha real de consumo. | El registro es válido en la AEAT y permite imputar el devengo fiscal al trimestre correcto. |

## 9. Comandas Nunca Cobradas (Impagos, Errores y Cortesías)

Si una comanda abierta nunca llega a cobrarse, **no se genera factura, no se calcula hash y no se envía nada a la AEAT**:

```text
                                [ OPEN ORDER ]
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
 [ UNPAID / "SIMPA" ]           [ ORDER ERROR ]             [ COMPLIMENTARY ]
   - status: VOIDED_UNPAID        - status: VOIDED_ERROR      - status: COMPLIMENTARY
   - Mandatory reason code        - Mandatory reason code     - Total: 0.00 €
   - 0 Invoices generated         - 0 Invoices generated      - 0 Invoices generated
   - Write to `audit_logs`        - Write to `audit_logs`     - Write to `audit_logs`

```

- **Control antifraude en el software:**

1. Anular líneas o mesas con consumiciones requiere código PIN de encargado o administrador.
2. Selección de motivo obligatorio (`UNPAID_CUSTOMER`, `DUPLICATE_ORDER`, `STAFF_ERROR`, `WASTE`).
3. Registro automático en la tabla `audit_logs`.

## 10. Control de Cierre Diario (Z-Report) y Ventas a Crédito

### A. Control de mesas en el Cierre de Caja (Z-Report)

Al ejecutar el cierre diario (`Close Shift / Z-Report`):

1. El backend comprueba si existen registros en `orders` con `status IN ('OPEN', 'PARTIALLY_PAID')`.
2. Si existen comandas pendientes, el sistema bloquea el cierre o exige su liquidación/anulación justificada.
3. El informe Z totaliza las ventas agrupando por `payment_method` (`CASH`, `CREDIT_CARD`, `BIZUM`).

### B. Ventas a crédito / Clientes habituales ("Apuntado")

- **Flujo estándar:** Se emite la factura simplificada (`F2`) u ordinaria (`F1`) en el día del consumo. En `payments` se registra con `payment_method: 'CUSTOMER_CREDIT'`. Cuando el cliente liquida la deuda semanas después, solo se genera un movimiento de tesorería interno en caja, **sin alterar la tabla `invoices` ni emitir nuevos hashes**.
