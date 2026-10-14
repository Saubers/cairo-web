-- Cairo — Order shipping/tracking fields
-- Source of truth: docs/context/database-schema.md
--
-- Adds a "shipped" lifecycle stage so admins can mark an order as dispatched
-- (after it's been paid) and capture the carrier + tracking number the
-- customer needs to follow their delivery.

-- Postgres has no "alter check constraint" — the existing constraint must be
-- dropped and recreated with the new allowed value. The constraint name
-- matches Postgres' auto-generated default (`<table>_<column>_check`) since
-- the original migration did not name it explicitly.
alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
    check (status in ('pending', 'in_process', 'paid', 'shipped', 'rejected', 'cancelled'));

alter table public.orders
  -- Both nullable: populated only once an admin marks the order "shipped".
  add column tracking_number text,
  add column shipping_provider text;
