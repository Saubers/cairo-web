-- Cairo — Close a privilege-escalation hole in `public.profiles`.
-- Source of truth: docs/context/database-schema.md
--
-- [CRITICAL SECURITY FIX]
--
-- `profiles_update_own` (see 20261005190013_init_schema.sql) only restricts
-- WHICH ROW an authenticated user may update (`auth.uid() = id`) — Postgres
-- RLS has no native column-level grain. It does NOT stop a user from
-- updating their OWN `role` column. Since `NEXT_PUBLIC_SUPABASE_ANON_KEY` is
-- public by design and every logged-in user already holds a valid session
-- JWT, any authenticated customer can open a browser console and run:
--
--   await supabase.from("profiles").update({ role: "admin" }).eq("id", myId)
--
-- `enforce_max_two_admins_trigger` only blocks a *3rd* admin row — with
-- exactly 2 admins already provisioned (see 20261006130000_assign_admins.sql)
-- this currently blocks the attack as an accidental side effect, but that
-- protection evaporates the moment an admin account is removed, before any
-- admin exists (fresh environment), or if the "max 2" rule is ever relaxed.
-- This must be fixed with an explicit guard, not left to depend on an
-- unrelated business rule.
--
-- Fix: a BEFORE UPDATE trigger that rejects any change to `role` unless the
-- ACTOR (not the row being modified) is already an admin. Scoped to
-- `auth.role() = 'authenticated'` so it never interferes with the
-- service-role business-logic layer (checkout/webhook) or with migrations
-- run directly against the database (e.g. `assign_admins.sql`), neither of
-- which carry a Supabase Auth JWT session.
create or replace function public.prevent_unauthorized_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated'
     and NEW.role is distinct from OLD.role
     and not public.is_admin() then
    raise exception 'Only an existing admin can change a profile''s role.';
  end if;
  return NEW;
end;
$$;

create trigger prevent_unauthorized_role_change_trigger
  before update on public.profiles
  for each row execute function public.prevent_unauthorized_role_change();
