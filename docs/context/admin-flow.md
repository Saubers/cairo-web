# Cairo — Admin Panel Flow

> Defines how the admin panel is protected, how roles are validated, and how catalog/order management works. The system supports **exactly two** Administrator accounts (see `database-schema.md` §2 for the role model and enforcement trigger).

## 1. Route Protection

### 1.1 Route grouping
Admin routes live under a dedicated route group, e.g. `app/(admin)/admin/...`, isolated from storefront and account routes both logically and in middleware scope.

```
/app
  /(admin)
    /admin
      /page.tsx                 → dashboard
      /products/page.tsx        → catalog list
      /products/[id]/page.tsx   → edit product
      /products/new/page.tsx    → create product
      /orders/page.tsx          → order list
      /orders/[id]/page.tsx     → order detail / status management
      /layout.tsx               → enforces auth + role check (see below)
```

### 1.2 Middleware-level gate
A Next.js `middleware.ts` intercepts requests to `/admin/*`:
1. Reads the Supabase session from cookies (via `@supabase/ssr`).
2. If no session → redirect to `/login?redirect=/admin`.
3. If session exists but the user is not resolved as admin yet, let the request through to the layout, which performs the authoritative role check (middleware does a cheap pre-check; the layout does the real one).

```ts
// middleware.ts
// Comment: redirect unauthenticated users away from admin routes early.
export const config = { matcher: ["/admin/:path*"] };
```

### 1.3 Layout-level authoritative check
The real authorization decision happens server-side in `app/(admin)/admin/layout.tsx`, a Server Component:

1. Fetch the current session via the server Supabase client.
2. Query `profiles` for the current `auth.uid()` and check `role === 'admin'`.
3. If not admin → `redirect('/')` (or a 403 page). Never rely on client-side checks alone — RLS also independently blocks any admin-only data mutation even if this layer were somehow bypassed, so protection is **defense in depth**: middleware (UX-level redirect) + layout (server-authoritative gate) + RLS (data-level enforcement).

```ts
// Comment: this is the authoritative role check; RLS backs it up at the data layer.
const { data: profile } = await supabase
  .from("profiles")
  .select("role")
  .eq("id", user.id)
  .single();

if (profile?.role !== "admin") {
  redirect("/");
}
```

### 1.4 Why three layers, not one
- **Middleware**: fast, avoids rendering protected pages for obviously unauthenticated requests. Not authoritative (can't safely query the DB from edge middleware for every request without cost/latency trade-offs).
- **Server layout check**: authoritative for *rendering* — determines whether the admin UI is ever shown.
- **RLS**: authoritative for *data access* — even if a bug ever let a non-admin render the admin UI, every underlying `insert`/`update`/`delete` on `products`/`categories`/`orders` still requires `is_admin()` to succeed at the database level. This is the real security boundary; the UI gates are about correct UX, not security alone.

## 2. Role Validation Model

- Role lives in `profiles.role` (`'customer' | 'admin'`), never in client-side state or JWT custom claims that the client could influence.
- Every admin-only Server Action / Route Handler re-validates the role server-side before performing the mutation — it does **not** trust that "the user reached this page" implies authorization (pages can be reached via stale cache, direct navigation, or future refactors).
- Promotion to admin is **not** self-service. It happens either:
  - Manually via the Supabase dashboard/SQL during initial setup (the 2 founding admin accounts), or
  - Through an admin-only "manage admins" action performed by an existing admin, guarded by `is_admin()` RLS policy and the `enforce_max_two_admins` trigger as a hard backstop.

## 3. Catalog Management

### 3.1 Product list (`/admin/products`)
- Server Component fetches all products (including inactive ones, since the admin query bypasses the `is_active = true` public filter via the `is_admin()` OR clause in RLS).
- Table view: image thumbnail, name, category, price, stock, active/inactive toggle, actions (edit/deactivate).

### 3.2 Create / Edit product (`/admin/products/new`, `/admin/products/[id]`)
- Form built with **React Hook Form** + **Zod** schema (`lib/schemas/product.ts`), shared between client validation and the Server Action's server-side re-validation.
- Fields: name, slug (auto-generated from name, editable), description, price, stock, category (select), images (upload), is_active (toggle).
- **Image upload flow**:
  1. Admin selects image(s) in the form.
  2. Client uploads directly to the `product-media` Supabase Storage bucket using the authenticated session (storage policy requires `is_admin()`).
  3. On successful upload, the resulting public URL(s) are appended to `image_urls` and the product row is created/updated via a Server Action.
- Server Action validates the Zod schema server-side again (never trusts client validation alone), then performs the `insert`/`update` using the user's session (RLS enforces `is_admin()` — no need for service role here since this is an authenticated admin, not an anonymous/system action).

### 3.3 Soft delete / deactivation
- Products are **never hard-deleted** by default — `is_active` is toggled to `false` instead. This preserves referential integrity for `order_items.product_id` on historical orders and avoids breaking past order records.
- A hard-delete action may be exposed for genuinely erroneous entries (e.g., created by mistake, never ordered), but should check for existing `order_items` references first and warn/block if any exist.

### 3.4 Categories management
- Simple CRUD under `/admin/categories`, same pattern (Zod + Server Action + `is_admin()` RLS).

## 4. Order Management

### 4.1 Order list (`/admin/orders`)
- Server Component fetches all orders (RLS's `is_admin()` clause grants full visibility, unlike customers who only see their own).
- Filterable/sortable by `status` (`pending`, `in_process`, `paid`, `rejected`, `cancelled`), date range, and customer.
- Each row shows: order ID (short), customer name/email, total, status badge, created date.

### 4.2 Order detail (`/admin/orders/[id]`)
- Shows full order: customer info, shipping address (`shipping_address` jsonb), line items (`order_items`, using the **snapshotted** `product_name`/`unit_price`, not a live join — reflects what was actually sold), payment status, Mercado Pago payment ID.
- **Status is primarily driven by the Mercado Pago webhook** (see `architecture.md` §3), not manually set by the admin in the common case. The admin view is read-mostly for this reason.
- Admins retain a manual override action (e.g., mark as `cancelled` for support cases — a customer requests cancellation after payment, stock issue, etc.), performed via a Server Action gated by `is_admin()` RLS, with the action logged (e.g., a simple `status_history` jsonb append or a separate audit table if auditability needs grow).

### 4.3 Stock adjustments from orders
- Stock decrement happens exclusively in the **Node.js webhook handler** upon confirmed payment (service role, outside RLS, as documented in `architecture.md`), not from the admin panel directly — this keeps the single source of truth for "stock was decremented because this order was paid" in one place, avoiding double-decrement bugs.
- The admin panel can still directly edit `stock` on the product form for manual inventory corrections (restocking, damaged goods write-off) — this is a distinct, explicit action from the automatic order-driven decrement.

## 5. Admin Dashboard (`/admin`)
- Lightweight landing page: recent orders, pending-order count, low-stock alerts (`stock < threshold`), basic revenue snapshot (sum of `paid` orders in a date range).
- All queries go through the `lib/data/admin/*.ts` repository functions (see `tech-stack.md` §3.3), kept separate from storefront data-access functions since their RLS assumptions (admin-only visibility) differ.

## 6. Summary of Enforcement Layers

| Layer | Mechanism | Purpose |
|---|---|---|
| Middleware | Session cookie check | Fast redirect for unauthenticated users |
| Server layout | `profiles.role === 'admin'` query | Authoritative render-time gate |
| Server Actions / Route Handlers | Re-validate role + Zod schema | Prevent stale-page or bypassed-UI mutations |
| RLS policies | `is_admin()` on every write to `products`, `categories`, `orders` | Final, non-bypassable data-level enforcement |
| DB trigger | `enforce_max_two_admins` | Hard backstop on the "exactly 2 admins" business rule |
