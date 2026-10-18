-- Phase 4E: server-side admin user listing and profile-status moderation need
-- read/update access. service_role already bypasses RLS; retain RLS and grant
-- only the two table privileges used by those protected server routes.
GRANT SELECT, UPDATE ON TABLE public.profiles TO service_role;
