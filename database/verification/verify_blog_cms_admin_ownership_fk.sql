-- READ-ONLY: verifies Blog CMS ownership references the application's admins table.
select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.blog_posts'::regclass
  and conname in ('blog_posts_created_by_fkey', 'blog_posts_updated_by_fkey')
order by conname;
