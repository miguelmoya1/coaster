# PROJECT BLUEPRINT: COASTER (PWA)

## 1. Executive Summary
**Product:** Coaster - High-performance "Digital Notepad" PWA for bars.
**Core Philosophy:** Offline-first, Single-Stream State, Zero-maintenance.
**Constraints:** No financials. Ephemeral data (Live + 1 Month History).
**Hosting:** Frontend (Vercel), Backend (Firebase).

## 2. Tech Stack

### Frontend (Client)
* **Framework:** Angular 19+ (Standalone).
* **State Management:** **Strict Signals Architecture**.
    * `signal()`, `computed()`, `effect()`.
    * `resource` API (experimental) or `toSignal` for streams.
    * **Forbidden:** Manual `.subscribe()` in Components/Services.
* **Styling:** TailwindCSS.
* **PWA:** `@angular/service-worker` (Manifest + Vercel caching).

### Backend (Serverless)
* **Platform:** Firebase.
* **Database:** **Firestore Only** (No Realtime Database).
    * Using `enableIndexedDbPersistence()` for offline support.
* **Compute:** Cloud Functions (Node.js) for Auth & Archiving.
* **Auth:** Google (Owners) + Anonymous/Custom Claims (Staff).

## 3. Architecture Layers

### Layer 1: Repository (Infrastructure)
* **Role:** Anti-Corruption Layer. Wraps `AngularFire`.
* **Pattern:** Converts `collectionData()` Observables directly into `Signals`.
* **Key Strategy:** **Single Global Subscription**. One stream reads all `live_orders` for the current bar. No distinct streams per view to save reads and ensure global consistency.

### Layer 2: Domain Store (Logic)
* **Role:** Business Logic & Derived State.
* **Pattern:** Injects Repository. Exposes `computed()` signals for UI filtering.
    * `kitchenOrders` = filter(type == 'kitchen' && status == 'pending')
    * `barOrders` = filter(type == 'bar' && status == 'pending')
    * `readyOrders` = filter(status == 'ready')

### Layer 3: UI (Presentation)
* **Role:** Dumb rendering.
* **Pattern:** `OnPush` components binding directly to Store signals.
* **Structure:** Bottom Navigation (Tables | Orders | Kitchen | Ready).

## 4. Data Model & Lifecycle

### A. Live Orders (Root Collection)
* **Path:** `/live_orders/{orderId}`
* **Scope:** All active items for a specific bar.
* **Retention:** Deleted immediately upon table closure.
* **Indexing:** Requires Composite Index on `[barId, createdAt]`.

### B. Bar Configuration
* **Path:** `/bars/{barId}`
* **Scope:** Configuration, Menu, Staff List, Table Layout.

### C. Archived History
* **Path:** `/history_logs/{logId}`
* **Trigger:** Cloud Function `archiveTable` moves data here on close.
* **TTL Policy:** Field `expireAt` set to 5th day of next month. Auto-delete.

## 5. Authentication Flow

1.  **Client:** Anonymous Auth + PIN Entry.
2.  **Function:** `validateStaffPin({ pin, barId })`.
3.  **Verification:** Checks hash in protected `/sys_secure` collection.
4.  **Result:** Sets Custom Claims `{ role: 'staff', barId: 'xyz' }`.
5.  **Security:** Security Rules strictly enforce `request.auth.token.barId == resource.data.barId`.

## 6. Implementation Directives

1.  **Setup:** Initialize Firebase (Functions/Firestore) and Vercel config.
2.  **Backend:** Implement `validateStaffPin` and `archiveTable` functions.
3.  **Core:** Define Interfaces (`models.ts`).
4.  **Repo:** Implement `OrdersRepository` with `toSignal` and Offline Persistence enabled.
5.  **Store:** Implement `OrdersStore` with computed signals for Kitchen/Bar views.
6.  **UI:** Implement Bottom Nav and Order Cards.

**CRITICAL:** Do not use Realtime Database. Use Firestore for everything.
