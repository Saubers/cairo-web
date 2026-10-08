# Cairo — Tech Stack & Design Patterns

> This document defines the mandatory and recommended technologies, libraries, and design patterns for Cairo. Any addition to this stack should be justified against these choices before being introduced.

## 1. Core Stack (Mandatory)

| Layer | Technology | Notes |
|---|---|---|
| Frontend framework | **Next.js (App Router)** | TypeScript strict mode. SSR/ISR for SEO-critical routes. |
| Language | **TypeScript (strict)** | `"strict": true` in `tsconfig.json`, no `any` unless explicitly justified with a comment. |
| Styling | **Tailwind CSS** | Utility-first; design tokens (colors, spacing, typography) centralized in `tailwind.config.ts` to respect the defined brand palette. |
| Database | **PostgreSQL (via Supabase)** | Managed, relational, RLS-first. |
| Auth | **Supabase Auth** | Email/password (+ optional social providers later). Roles via `profiles` table, not custom JWT claims, to keep logic queryable and auditable. |
| Storage | **Supabase Storage** | Product images, media assets. |
| Payments | **Mercado Pago SDK (Node)** | Checkout Pro + Webhooks. Server-side only. |
| Business logic runtime | **Node.js** | Isolated serverless functions (webhooks, order creation, payment reconciliation). |
| Hosting (frontend) | **Vercel** | Edge network, ISR, preview deployments. |
| Hosting (backend/DB) | **Supabase native infra** (AWS reserved as future escape hatch) | |

## 2. Recommended Libraries

### State Management
- **Zustand** — client-side global state (cart, UI state like collapsed navbar, filter drawers). Chosen over Redux for minimal boilerplate and because Cairo's client state needs are modest (cart, UI flags) rather than complex cross-cutting state.
- Avoid React Context for frequently-updated state (e.g., cart) to prevent unnecessary re-renders; reserve Context for rarely-changing values (theme, auth session passthrough).

### Forms & Validation
- **React Hook Form** — all forms (checkout address, login/register, admin product CRUD, contact).
- **Zod** — single source of truth for validation schemas, shared between:
  - Client-side form validation (via `@hookform/resolvers/zod`).
  - Server-side validation in API routes / Server Actions (never trust client validation alone).
  - Type inference (`z.infer<typeof schema>`) to avoid duplicating TypeScript types.

### Data Fetching & Server Communication
- **Supabase JS Client (`@supabase/supabase-js`)** — direct reads from Server/Client Components using the anon key, respecting RLS.
- **Supabase SSR helpers (`@supabase/ssr`)** — for session-aware Server Components and Route Handlers (cookie-based auth sync between client and server).
- **Next.js Server Actions** — preferred over hand-rolled `fetch` calls for mutations originating from forms where co-location with the component is desirable (e.g., admin CRUD).
- **Route Handlers (`app/api/.../route.ts`)** — for the Node.js business logic layer: Mercado Pago preference creation, webhook endpoint. Not Server Actions, since these must be plain HTTP endpoints callable by Mercado Pago.

### Payments
- **`mercadopago` (official Node SDK)** — preference creation, payment lookup for webhook reconciliation.

### UI & Accessibility
- **Radix UI primitives** (or **shadcn/ui** built on Radix) — unstyled, accessible primitives (Dialog, DropdownMenu, Toast) composed with Tailwind, keeping full control over the brand's visual identity instead of inheriting a pre-styled design system.
- **`clsx`** — conditional className composition.
- **`lucide-react`** — icon set, tree-shakeable, consistent stroke style.

### Images & Media
- **`next/image`** — mandatory for all product imagery (automatic optimization, lazy loading, responsive `sizes`), sourced from Supabase Storage public URLs.

### Utilities
- **`date-fns`** — date formatting (order dates, admin dashboards). Avoid `moment.js` (unmaintained, heavier).
- **`nanoid`** or native `crypto.randomUUID()` — short IDs where UUIDs are overkill (not for primary keys — see database schema, which uses UUID PKs).

### Email (Transactional)
- **Resend** (or Supabase-compatible alternative) — order confirmation, payment status emails, triggered from the Node.js layer after webhook processing.

### Testing
- **Vitest** — unit tests for business logic (pricing, stock validation, webhook signature verification).
- **Playwright** — E2E tests for critical flows (checkout, admin catalog CRUD).

### Linting / Formatting
- **ESLint** (Next.js config + `@typescript-eslint`) — strict rules, no unused vars, no implicit `any`.
- **Prettier** — consistent formatting, Tailwind class sorting via `prettier-plugin-tailwindcss`.

## 3. Design Patterns

### 3.1 Layered Trust Boundaries
- **Client (anon key)** → only RLS-governed reads/writes.
- **Server Actions / Route Handlers (user session)** → operate on behalf of the authenticated user, still RLS-governed.
- **Node.js business logic (service role key)** → the *only* layer allowed to bypass RLS, strictly for: order creation at checkout, webhook-driven order updates, stock decrements. This boundary must never be blurred.

### 3.2 Schema-Driven Validation
- Every form and every API route input is validated against a Zod schema. Schemas live in a shared `lib/schemas/` directory and are imported by both client forms and server handlers — single source of truth, no drift.

### 3.3 Repository-Style Data Access
- Supabase queries are not scattered ad-hoc through components. Instead, encapsulate queries in `lib/data/*.ts` modules (e.g., `getProducts()`, `getOrderById()`, `createOrder()`), each with explicit return types. Components and Server Actions call these functions, never raw `supabase.from(...)` inline (except within the data layer itself). This isolates query logic, makes RLS assumptions explicit per function, and simplifies testing.

### 3.4 Server-First Rendering
- Default to Server Components. Promote to Client Components only when interactivity (state, effects, event handlers) is strictly required — cart, filters, forms, collapsed navbar toggle, admin dashboards with live updates.

### 3.5 Idempotent Webhook Handling
- The Mercado Pago webhook handler must be idempotent: re-processing the same notification (which MP may send more than once) must not double-decrement stock or duplicate side effects. Enforce via a unique constraint on `orders.payment_id` or an explicit status-transition guard (`if order.status === 'paid' return`).

### 3.6 Feature-Based Folder Structure (suggested)
```
/app
  /(storefront)        → public catalog, product, cart, checkout pages
  /(account)           → customer account area (protected)
  /(admin)             → admin panel (protected, role-gated)
  /api
    /checkout          → Node.js: create MP preference
    /webhooks/mp        → Node.js: MP webhook receiver
/lib
  /data                → Supabase repository functions
  /schemas             → Zod schemas
  /supabase            → Supabase client factories (browser/server/service-role)
/stores                → Zustand stores
/components
  /ui                  → Radix/shadcn-based primitives
  /storefront
  /admin
```

## 4. Strict Project-Wide Rule

- **All TypeScript must be strict** (`strict: true`, no implicit `any`, no unchecked non-null assertions without justification).
- **All in-code comments must be written in English**, regardless of the language used in product copy, documentation, or commit messages. This applies to every file generated from this point forward.
