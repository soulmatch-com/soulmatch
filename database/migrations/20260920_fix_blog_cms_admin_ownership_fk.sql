-- Corrects the Blog CMS ownership foreign keys after the initial CMS migration.
-- The application resolves verified admins from public.admins, not auth.users.
-- Apply only after 20260919_create_blog_cms.sql through the approved SQL workflow.

begin;

alter table public.blog_posts
  drop constraint if exists blog_posts_created_by_fkey,
  drop constraint if exists blog_posts_updated_by_fkey;

alter table public.blog_posts
  add constraint blog_posts_created_by_fkey
    foreign key (created_by) references public.admins(id) on delete set null,
  add constraint blog_posts_updated_by_fkey
    foreign key (updated_by) references public.admins(id) on delete set null;

commit;
