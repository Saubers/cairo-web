-- Promote the two designated store-owner accounts to 'admin'.
--
-- `public.profiles.role` is matched against `auth.users.email` by id. The
-- `enforce_max_two_admins_trigger` (see 20261005190013_init_schema.sql)
-- caps the table at 2 admin rows, so this statement must target exactly
-- these two accounts and no more.
update public.profiles
set role = 'admin'
where id in (
  select id
  from auth.users
  where email in ('jimerivacorvino@gmail.com', 'rivajulieta929@gmail.com')
);
