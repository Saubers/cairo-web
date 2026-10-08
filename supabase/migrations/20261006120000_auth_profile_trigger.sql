-- Cairo — Auto-creates a `public.profiles` row whenever a new user signs up
-- through Supabase Auth. Required for the admin role check (middleware +
-- admin layout) to have a row to query, and for `profiles_update_own` RLS
-- to apply to every authenticated user from their very first request.
-- `role` is intentionally omitted from the insert so it falls back to the
-- table default ('customer') — no signup path can self-assign 'admin'.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
