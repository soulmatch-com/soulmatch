-- Read-only verification SQL. Do not apply mutations with this file.
select table_name, row_security from information_schema.tables where table_schema = 'public' and table_name in ('blog_posts', 'blog_post_translations');
select indexname, indexdef from pg_indexes where schemaname = 'public' and tablename in ('blog_posts', 'blog_post_translations') order by tablename, indexname;
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition from pg_constraint where conrelid in ('public.blog_posts'::regclass, 'public.blog_post_translations'::regclass) order by table_name::text, conname;
select grantee, table_name, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name in ('blog_posts', 'blog_post_translations') order by table_name, grantee, privilege_type;
