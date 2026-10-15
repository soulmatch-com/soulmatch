-- Phase 4E: `admins` is protected by RLS, including an explicit service_role
-- policy, but the table lacked SQL privileges for that role in local schema
-- instances.  Keep RLS enabled and grant only the CRUD operations required by
-- server-side admin authentication and the local fixture lifecycle.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admins TO service_role;
