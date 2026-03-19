# 🍺 Coaster (BarTeam)

## 📖 What is Coaster?

Coaster is an internal operational tool tailored for small service businesses like hospitality venues (bars, restaurants, cafes), workshops, and clinics.

**Main Goal:** To eliminate the chaos of WhatsApp groups and paper-based tracking in Human Resources and Inventory Management.

**Philosophy:** _"No Billing"_. Coaster does not handle billing, payments, or final customers. It is strictly designed for internal operational management and team coordination.

## ✨ What Can Coaster Do?

### 📅 HR Module (The Roster)

Manages who works and when, keeping the entire team on the same page.

- **Multi-view Calendar:** Users can seamlessly toggle between Daily, Weekly, and Monthly shift views.
- **Shift Assignment:** Admins/Owners can create shifts and assign them to staff members.
- **Shift Marketplace:** Staff members can "drop" a shift for someone else to "pick up" via the shift exchange system.
- **Staff Management:** Role-based access control (`OWNER` vs `STAFF`) to manage operations securely.
- **Time Tracking (Upcoming):** Geolocation-based clock-in and clock-out functionality.

### 📦 Logistics & Inventory Module (The Pantry)

Tracks what items are missing and swiftly generates supply orders.

- **Visual Catalog:** Designed with large icons/visuals to facilitate rapid use on touch screens.
- **Traffic Light System:** Instant visual recognition of stock state — "OK" (Green), "Low Stock" (Yellow), or "Out of Stock" (Red).
- **Smart Ordering:** Automatically groups missing items and generates a pre-formatted text message ready to be forwarded to suppliers via WhatsApp.

### 🔔 Mobile-First & Real-Time Alerts

- **Push Notifications:** Deep integration with Firebase Cloud Messaging (FCM) to deliver mobile push notifications to staff for important occurrences (e.g., requested shift changes, newly assigned shifts).

---

## 🛠️ The Golden Stack (Architecture)

Coaster is built using a modern, scalable, and robust technological stack:

- **Monorepo Strategy:** Nx (Integrated).
- **Backend:** NestJS + Prisma ORM + PostgreSQL.
- **Frontend:** Angular 21 + Tailwind CSS v4 + Signals.
- **Testing:** Jest (Unit Tests) + Supertest/Playwright (E2E).
- **Infrastructure:** Docker (Local Development) / Google Cloud Run + Neon (Production Environment).

---

## 🚀 Getting Started & Running Tasks

This project is an [Nx workspace](https://nx.dev).

### Run the Dev Servers

To run the frontend/backend servers for your app, use:

```sh
# Run the Backend API
npx nx serve api

# Run the Frontend App
npx nx serve coaster
```

### Build for Production

To create a production bundle:

```sh
npx nx build api
npx nx build coaster
```

### Useful Commands

- Run Unit Tests: `npx nx test api` / `npx nx test coaster`
- Explore Workspace: `npx nx graph`
- Generate new code using Nx plugins: `npx nx g @nx/angular:component my-component`

## 🤝 Support & Nx Resources

- [Learn more about Nx Workspaces](https://nx.dev/getting-started/tutorials/angular-monorepo-tutorial)
- [Nx Console for your IDE](https://nx.dev/getting-started/editor-setup)
