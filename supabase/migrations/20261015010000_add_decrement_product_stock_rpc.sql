-- Cairo — Atomic stock decrement for the Mercado Pago webhook.
-- Source of truth: docs/context/database-schema.md
--
-- Why an RPC instead of a JS read-then-write loop: the webhook can process
-- several `order_items` rows (and, in theory, concurrent notifications)
-- against the same `products` row. A "SELECT stock, then UPDATE stock - qty"
-- round-trip from the service-role client is a classic lost-update race —
-- two concurrent decrements can both read the same stale `stock` value and
-- each write back a result that ignores the other's decrement. Doing the
-- read + subtract + floor-at-zero entirely inside a single atomic UPDATE
-- statement closes that window: Postgres's own row-level locking serializes
-- concurrent calls against the same product row.
--
-- `security definer` + `set search_path = public` mirrors the pattern
-- already used by `prevent_unauthorized_role_change` (see
-- 20261015000000_prevent_role_self_escalation.sql). `execute` is restricted
-- to `service_role` only — this must never be callable with the public
-- anon/authenticated key, since it has no caller-side authorization check
-- of its own (the webhook is the only trusted caller).
create or replace function public.decrement_product_stock(p_product_id uuid, p_quantity integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set stock = greatest(0, stock - p_quantity)
  where id = p_product_id;
end;
$$;

revoke all on function public.decrement_product_stock(uuid, integer) from public, anon, authenticated;
grant execute on function public.decrement_product_stock(uuid, integer) to service_role;
