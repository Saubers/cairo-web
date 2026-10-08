# Cairo — Architecture

> **Project**: Cairo — national e-commerce (Argentina) for women's accessories (handbags, minibags, totebags, necklaces).
> **Status**: Foundational context document. All architectural decisions here are binding for future development unless explicitly revised.

## 1. High-Level Overview

Cairo is composed of three macro layers:

1. **Frontend** — Next.js (App Router, TypeScript) deployed on Vercel. Server-rendered for SEO, client-interactive for cart/checkout UX.
2. **Backend-as-a-Service** — Supabase (PostgreSQL + Auth + Storage + Row Level Security). Handles persistence, authentication, authorization, and media storage.
3. **Business Logic Layer** — A thin, isolated Node.js layer (deployed as serverless functions or a small dedicated service) responsible for logic that must **not** live in the client or be trusted to RLS alone: Mercado Pago webhook processing, order state transitions, and payment signature verification.

```
┌─────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                        │
│  Next.js App Router (SSR/SSG/ISR) + React Client Components       │
└───────────────┬─────────────────────────────┬─────────────────────┘
                │                             │
                │ (1) Data fetch / mutations   │ (2) Checkout init
                ▼                             ▼
┌───────────────────────────┐   ┌─────────────────────────────────┐
│   Supabase (BaaS)         │   │  Node.js Business Logic Layer    │
│  - PostgreSQL              │   │  (Vercel Serverless Functions /  │
│  - Auth (RLS enforced)     │   │   isolated Node service)         │
│  - Storage (product media) │   │  - Creates MP preference          │
│  - Realtime (optional)     │   │  - Verifies MP webhook signature  │
└───────────────┬────────────┘   │  - Updates order status           │
                │                 │  - Sends transactional emails     │
                │                 └───────────────┬───────────────────┘
                │                                 │
                │ (3) Service-role writes          │ (4) Webhook callback
                │     (order status, stock)        │
                ▼                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Mercado Pago (Checkout Pro)                  │
│   - Hosted checkout page                                           │
│   - Sends IPN/Webhook on payment status change                     │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Component Responsibilities

### 2.1 Next.js Frontend (Vercel)
- Renders catalog, product detail, cart, checkout, user account, and admin panel.
- Uses **Server Components** for SEO-critical, data-heavy pages (catalog, product detail, category/landing pages) to maximize crawlability and Core Web Vitals.
- Uses **Client Components** for stateful, interactive UI (cart drawer, filters, forms, collapsed navbar logo swap).
- Talks to Supabase directly via the **anon key** for public, RLS-protected reads (products, categories, stock) and authenticated user operations (profile, order history).
- Talks to Supabase via the **user's session token** (never service role) for any client-originated write, so RLS is always the enforcement boundary.
- Never calls Mercado Pago or performs payment logic directly — it only invokes the Node.js layer to *create* a checkout preference, then redirects the user to the Mercado Pago hosted page.

### 2.2 Supabase (PostgreSQL + Auth + Storage)
- Single source of truth for all persistent data: users, products, orders, order items, categories, addresses.
- **Auth**: manages client and admin identities. Role distinction (`customer` vs `admin`) is stored in a `profiles` table linked 1:1 to `auth.users`, never inferred from the client.
- **RLS**: every table has RLS enabled. Public tables (products, categories) allow anonymous `SELECT`. Mutating operations (`INSERT`/`UPDATE`/`DELETE`) on catalog and orders are restricted to rows owned by the authenticated user, or to users whose `profiles.role = 'admin'`.
- **Storage**: product images and media live in a Storage bucket (`product-media`), publicly readable, write-restricted to admins via storage policies.

### 2.3 Node.js Business Logic Layer
- Deployed as **isolated serverless functions** (e.g. Vercel Functions in a dedicated `/api` scope, or a separate small Node service if logic grows) — kept logically and physically separate from the rendering layer so payment/webhook code never shares a trust boundary with public-facing routes.
- Responsibilities:
  - Create Mercado Pago **Checkout Pro** preferences (server-side, using the MP access token — never exposed to the client).
  - Receive and **verify** Mercado Pago webhook notifications (signature/HMAC validation).
  - Use the **Supabase service role key** (server-only, never shipped to the client) to update `orders.status`, decrement stock, and record payment metadata.
  - Trigger side effects: confirmation emails, admin notifications.
- This layer is the **only** component authorized to use the Supabase service role key.

### 2.4 Mercado Pago
- **Checkout Pro**: the user is redirected to a Mercado Pago-hosted payment page after the Node.js layer creates a preference tied to the order.
- **Webhooks (IPN)**: on payment approval/rejection/pending, Mercado Pago calls back the Node.js webhook endpoint, which validates the notification and updates order state in Supabase.

## 3. Primary Purchase Flow (End-to-End)

1. **Browse**: User browses catalog (Next.js Server Components fetch products from Supabase via anon key, SSR/ISR for SEO).
2. **Cart**: User adds items to cart. Cart state is managed client-side (Zustand) and persisted (localStorage or a `carts` table if the user is authenticated).
3. **Checkout initiation**: User proceeds to checkout. Next.js calls an internal API route (Node.js layer) with the cart contents.
4. **Order creation**: Node.js layer validates stock/prices server-side, creates a `pending` order + `order_items` rows in Supabase (via service role, bypassing RLS safely under controlled logic), then calls Mercado Pago's API to create a **Checkout Pro preference** referencing that order's ID as `external_reference`.
5. **Redirect to Mercado Pago**: The frontend redirects the user to the MP-hosted checkout URL returned by the Node.js layer.
6. **Payment**: User completes payment on Mercado Pago's domain.
7. **Webhook notification**: Mercado Pago asynchronously calls the Node.js webhook endpoint with the payment result.
8. **Order reconciliation**: Node.js layer verifies the webhook signature, fetches the full payment status from MP's API (never trusting the webhook payload blindly), and updates the corresponding order's status (`paid`, `rejected`, `in_process`) in Supabase, decrementing stock on confirmed payment.
9. **User redirect / confirmation**: Mercado Pago redirects the user back to a Next.js `success` / `failure` / `pending` page, which reads the order status from Supabase (via the anon key, scoped to the user's own order through RLS) to render final confirmation.
10. **Admin visibility**: The order appears immediately in the Admin Panel (real-time or on next fetch), since admins have RLS-granted read access to all orders.

## 4. Deployment Topology

- **Frontend (Next.js)**: Vercel. Edge/CDN-cached static and ISR pages for catalog; serverless functions for dynamic routes and the Node.js business logic layer (co-located in the same Vercel project under a clearly separated `/app/api` boundary, or split into its own Vercel project if isolation needs grow).
- **Backend/DB (Supabase)**: Supabase-hosted PostgreSQL, Auth, and Storage. No self-managed DB infrastructure initially; AWS is reserved as a future option only if Cairo outgrows Supabase's managed offering (e.g., heavy custom backend jobs, queues, or compliance needs).
- **Secrets boundary**: Mercado Pago access token and Supabase service role key exist **only** in server-side environment variables of the Node.js layer — never in `NEXT_PUBLIC_*` variables.

## 5. Non-Functional Priorities

- **SEO**: SSR/ISR for all public catalog pages, semantic HTML, structured data (Product schema), sitemap and robots.txt generation.
- **Security**: RLS as the default-deny posture; service role key isolated to the Node.js layer; webhook signature verification mandatory.
- **Responsiveness**: Mobile-first layout; navbar must swap to a simplified/icon-only logo mark below a defined breakpoint or on scroll-collapse.
