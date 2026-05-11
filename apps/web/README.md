# 🏗️ Arquitectura Frontend: Coaster Clean-Screaming Architecture

Este proyecto utiliza una evolución de **Clean Architecture** adaptada al ecosistema moderno de **Angular (Signals & Standalone)**, aplicando los principios de **Screaming Architecture** (la estructura grita el propósito del negocio) y **Vertical Slicing**.

## 🎯 Objetivos de la Arquitectura

- **Aislamiento de Lógica:** El dominio (negocio) no sabe nada de la UI ni de los frameworks.
- **Estado Reactivo Centralizado:** Uso de `Stores` (Basados en Signals) como directores de orquesta.
- **Componentes Tontos vs. Inteligentes:** Clara distinción entre componentes visuales y páginas que manejan estado.
- **Contratos Estrictos:** Uso de `index.ts` (Public API) para evitar fugas de implementación.

---

## 🗺️ Mapa Global del Proyecto

La aplicación se divide en dos grandes bloques: **Islas de Dominio** y **Capa de Presentación**.

```text
src/app/
├── core/                       # Singleton services (Auth, Interceptors, Config)
├── [domain-islands]/           # Lógica pura por feature (bars, orders, products...)
│   ├── data-access/            # Repositorios (HTTP) y Mappers
│   ├── use-cases/              # Reglas de negocio atómicas (Acciones)
│   ├── store/                  # ORQUESTADOR (Signals, Resources, Encadenamiento)
│   └── index.ts                # Puerta de entrada (Public API)
│
├── presentation/               # CAPA VISUAL (Sin lógica de negocio)
│   ├── components/             # UI Kit Genérico (Botones, Inputs, Modales)
│   ├── pipes/                  # Transformadores visuales globales
│   ├── [feature-ui]/           # UI específica (auth, bars, pantry...)
│   │   ├── components/         # Componentes específicos (bar-card, bar-badge)
│   │   ├── pages/              # Smart Components (Enrutados)
│   │   └── [feature].routes.ts # Definición de rutas
│   └── main/                   # Vistas agregadoras (Dashboard, Layouts principales)
```

---

## 🛠️ Las 3 Capas en Detalle (Ejemplo: `bars`)

### 1. Dominio y Lógica (`src/app/bars`)

Es el cerebro de la aplicación. Aquí no hay HTML ni CSS.

- **Data Access:** Repositorios que devuelven Promesas/Observables y Mappers que limpian los datos de la API.
- **Use Cases:** Clases `execute()` que realizan una única acción (ej: `CreateBar`).
- **Store (El Orquestador):** Centraliza el estado reactivo con `Signals` y `httpResource`. Gestiona el "qué pasa después de X" (Encadenamiento).

#### Ejemplo de Store:

```typescript
@Injectable({ providedIn: 'root' })
export class BarsStore {
  readonly #createBarUC = inject(CreateBarUseCase);
  readonly #getBarsUC = inject(GetBarsUseCase);

  readonly #barsResource = httpResource(() => this.#getBarsUC.execute());

  async create(dto: CreateBarDto) {
    try {
      await this.#createBarUC.execute(dto); // 1. Acción
      this.#listResource.reload(); // 2. Encadenamiento (Refresco)
      return null; // Éxito para Signal Forms
    } catch (error) {
      return handleError(error); // Error para Signal Forms
    }
  }
}
```

### 2. Capa de Presentación (`src/app/presentation`)

Es la piel de la aplicación. Se encarga de pintar y capturar eventos.

- **Components (UI Kit):** Componentes transversales (`coaster-btn`). No tienen lógica de negocio.
- **Feature Components:** Componentes que solo tienen sentido dentro de una feature (`bar-card`).
- **Pages (Smart Components):** Inyectan el `Store`, leen sus `Signals` y envían las acciones del usuario.

#### Ejemplo de Comunicación Store -> Form:

```typescript
// En presentation/bars/pages/create-bar.page.ts
export class CreateBarPage {
  readonly store = inject(BarsStore); // Acceso directo al orquestador

  readonly form = form(..., {
    submission: {
      action: async (f) => await this.store.create(f().value())
    }
  });
}
```

### 3. Public API (`index.ts`)

Cada isla de dominio tiene un `index.ts` que actúa como frontera. **Solo exporta lo necesario**.

```typescript
// src/app/bars/index.ts
export { BarsStore } from './store/bars.store';
export type { Bar, BarId } from './models/bar.model';
// ⛔ NUNCA exportar repositorios o casos de uso internamente.
```

---

## 🚦 Reglas de Oro (Para cumplir la Arquitectura)

1. **Regla de Dependencia:** La capa de Dominio **NUNCA** puede importar nada de la capa de Presentación. La Presentación sí puede importar del Dominio.
2. **Fronteras de Dominio:** Una página de `presentation/pantry` puede inyectar tanto `BarsStore` como `PantryStore` si necesita datos de ambos, pero `BarsStore` nunca debe importar cosas de `Pantry`.
3. **Encadenamiento:** Toda lógica de refresco (ej: "si borro un bar, refresca la lista") debe vivir en el `Store`, no en el componente.
4. **Ubicación de Componentes:**
   - ¿Se usa en toda la app? ➡️ `presentation/components/`
   - ¿Es específico de una lógica? ➡️ `presentation/[feature]/components/`
5. **Signal Forms:** El método `submission.action` del formulario debe llamar siempre a un método del `Store` que devuelva `Promise<TreeValidationResult | null>`.

---

## 🚀 Cómo crear una nueva Feature

1. **Dominio:** Crea la carpeta en `src/app/nombre-feature`.
2. **Lógica:** Define el `Repository`, el `Mapper` y los `Use Cases`.
3. **Estado:** Crea el `Store` inyectando los casos de uso y exponiendo los `Signals/Resources`.
4. **Contrato:** Exporta el `Store` en el `index.ts`.
5. **UI:** Crea la carpeta en `src/app/presentation/nombre-feature`.
6. **Vista:** Crea las `pages`, los `components` específicos y define las `routes`.
7. **Rutas:** Registra las rutas en el `app.routes.ts` principal.

---

> _"Arquitectura clara, código sano, equipo feliz."_ 🍹
