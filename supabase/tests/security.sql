-- Run as postgres on a DISPOSABLE database after all migrations. Everything rolls back.
begin;
do $$ begin
  if exists(select 1 from public.profiles) then raise exception 'Use an empty disposable test database'; end if;
end $$;
create function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'ASSERT: %', message; end if; end $$;
create function pg_temp.denied(command text) returns void language plpgsql as $$
begin
  execute command;
  raise exception 'ASSERT: unexpected permission: %', command;
exception when insufficient_privilege then null;
end $$;
insert into auth.users(id,email,raw_user_meta_data) values
('10000000-0000-4000-8000-000000000001','author@example.test','{}'),
('10000000-0000-4000-8000-000000000002','editor@example.test','{}'),
('10000000-0000-4000-8000-000000000003','admin@example.test','{}'),
('10000000-0000-4000-8000-000000000004','editor-b@example.test','{}');
update public.profiles set role='editor' where id='10000000-0000-4000-8000-000000000002';
update public.profiles set role='admin' where id='10000000-0000-4000-8000-000000000003';
update public.profiles set role='editor' where id='10000000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select pg_temp.denied($q$insert into public.articles(author_id,title,status) values(auth.uid(),'Illegal publish','published')$q$);
select pg_temp.denied($q$insert into public.articles(author_id,title,status) values(auth.uid(),'Illegal approval','approved')$q$);
select pg_temp.denied($q$insert into public.articles(author_id,title,status) values(auth.uid(),'Illegal schedule','scheduled')$q$);
select pg_temp.denied($q$insert into public.articles(author_id,title,status) values(auth.uid(),'Illegal archive','archived')$q$);
select pg_temp.denied($q$insert into public.articles(author_id,title,is_featured) values(auth.uid(),'Illegal feature',true)$q$);
select pg_temp.denied($q$insert into public.articles(author_id,title,is_advertorial) values(auth.uid(),'Illegal advertorial',true)$q$);
select pg_temp.denied($q$insert into public.articles(author_id,title,slug) values(auth.uid(),'Illegal slug','injected')$q$);
select pg_temp.denied($q$insert into public.articles(author_id,title,editor_id) values(auth.uid(),'Illegal editor',auth.uid())$q$);
select pg_temp.denied($q$insert into public.articles(author_id,title,published_at) values(auth.uid(),'Illegal timestamp',now())$q$);
select pg_temp.denied($q$insert into public.articles(author_id,title,view_count) values(auth.uid(),'Illegal count',1000)$q$);
select pg_temp.denied($q$insert into public.articles(author_id,title,status) values('10000000-0000-4000-8000-000000000002','Other owner','draft')$q$);
insert into public.articles(author_id,title,status) values(auth.uid(),'Security test article','draft');
select pg_temp.denied($q$update public.articles set status='published' where title='Security test article'$q$);
update public.articles set status='submitted' where title='Security test article';
select pg_temp.assert((select status='submitted' from public.articles where title='Security test article'),'author can submit draft');
select pg_temp.denied($q$update public.articles set is_advertorial=true where title='Security test article'$q$);
select pg_temp.denied($q$select public.increment_article_view('any')$q$);
do $$ begin
  begin
    perform public.review_article((select id from public.articles where title='Security test article'),'published','submitted',null,false);
    raise exception 'ASSERT: author reviewed';
  exception when raise_exception then if sqlerrm <> 'editor access required' then raise; end if; end;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select public.review_article((select id from public.articles where title='Security test article'),'approved','submitted',null,true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
-- Editor B submits the same stale status that editor A has already changed.
do $$ begin
  begin
    perform public.review_article((select id from public.articles where title='Security test article'),'rejected','submitted','A stale decision',false);
    raise exception 'ASSERT: stale editor overwrote decision';
  exception when serialization_failure then null; end;
end $$;
select pg_temp.assert((select status='approved' and is_advertorial from public.articles where title='Security test article'),'stale decision leaves status and label intact');
select public.review_article((select id from public.articles where title='Security test article'),'published','approved',null,true);
select pg_temp.assert((select status='published' and slug is not null and published_at is not null from public.articles where title='Security test article'),'editor publishes with slug and timestamp');
do $$ begin
  begin
    perform public.review_article((select id from public.articles where title='Security test article'),'revision','published','Invalid published rollback',false);
    raise exception 'ASSERT: published returned to revision';
  exception when raise_exception then if sqlerrm <> 'invalid editorial transition' then raise; end if; end;
end $$;
select public.review_article((select id from public.articles where title='Security test article'),'archived','published',null,true);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$ begin
  begin
    perform public.set_profile_role(auth.uid(),'contributor');
    raise exception 'ASSERT: last admin demoted';
  exception when raise_exception then if sqlerrm <> 'last admin' then raise; end if; end;
end $$;
select public.set_profile_role('10000000-0000-4000-8000-000000000002','admin');
select public.set_profile_role(auth.uid(),'contributor');
select pg_temp.assert((select count(*)=1 from public.profiles where role='admin'),'one admin remains after valid demotion');
reset role;
-- Revision remains editable by its author; submit preserves protected editorial fields.
update public.articles set status='revision', is_advertorial=true where title='Security test article';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
update public.articles set status='submitted',body='Revised article' where title='Security test article';
select pg_temp.assert((select status='submitted' and is_advertorial from public.articles where title='Security test article'),'author can submit revision without changing editorial label');
reset role;
insert into public.site_configuration(storage_origin) values('https://project.supabase.co');
select pg_temp.assert((select allowed_mime_types = array['image/webp'] from storage.buckets where id='article-images'),'article bucket accepts WebP only');
insert into storage.objects(bucket_id,name,owner_id) values
('article-images','10000000-0000-4000-8000-000000000001/test.webp','10000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
insert into public.articles(author_id,title,cover_url) values(auth.uid(),'Image test','https://project.supabase.co/storage/v1/object/public/article-images/10000000-0000-4000-8000-000000000001/test.webp');
delete from storage.objects where name='10000000-0000-4000-8000-000000000001/test.webp';
select pg_temp.assert((select count(*)=1 from storage.objects where name='10000000-0000-4000-8000-000000000001/test.webp'),'active article image cannot be deleted');
do $$ begin
  begin
    insert into public.articles(author_id,title,cover_url) values(auth.uid(),'Foreign URL','https://evil.example/storage/v1/object/public/article-images/10000000-0000-4000-8000-000000000001/test.webp');
    raise exception 'ASSERT: foreign URL accepted';
  exception when raise_exception then if sqlerrm <> 'invalid article image' then raise; end if; end;
  begin
    insert into public.articles(author_id,title,cover_url) values(auth.uid(),'Foreign owner','https://project.supabase.co/storage/v1/object/public/article-images/10000000-0000-4000-8000-000000000002/test.webp');
    raise exception 'ASSERT: foreign owner accepted';
  exception when raise_exception then if sqlerrm <> 'invalid article image owner' then raise; end if; end;
end $$;
update public.articles set cover_url=null where title='Image test';
delete from storage.objects where name='10000000-0000-4000-8000-000000000001/test.webp';
select pg_temp.assert((select count(*)=0 from storage.objects where name='10000000-0000-4000-8000-000000000001/test.webp'),'unreferenced owner image can be deleted');
reset role;
rollback;
