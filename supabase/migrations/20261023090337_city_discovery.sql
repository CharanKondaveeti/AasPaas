begin;
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
grant usage on schema extensions to anon,authenticated,service_role;

create table public.admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
grant all on public.admins to service_role;

create table public.places (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(name) between 2 and 100),
 city text not null default 'hyderabad',
 category text not null default 'Places' check(category in ('Food','Places','Nature','Shopping','Fun & Activities')),
 dish text check(dish in ('Biryani','Punugulu','Samosa','Chaat','Dosa','Vada','Tea','Sweets')),
 famous_for text not null check(char_length(famous_for) between 5 and 400),
 description text not null default '' check(char_length(description)<=1000),
 area text not null default '' check(char_length(area)<=150),
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 location extensions.geometry(Point,4326) generated always as (extensions.st_setsrid(extensions.st_makepoint(longitude,latitude),4326)) stored,
 source_url text check(source_url is null or source_url ~ '^https://'),
 photo_path text check(photo_path is null or photo_path ~ '^[0-9a-f-]{36}\.webp$'),
 photo_credit text check(char_length(photo_credit)<=200),
 hours text check(char_length(hours)<=150),
 price text check(char_length(price)<=100),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index places_location_gist on public.places using gist(location);
create index places_review_idx on public.places(status,created_at desc);
create index places_city_category_idx on public.places(city,category) where status='approved';
create index places_search_idx on public.places using gin ((lower(name||' '||area||' '||category||' '||coalesce(dish,'')||' '||famous_for)) extensions.gin_trgm_ops);
alter table public.places enable row level security;
revoke all on public.places from anon,authenticated;
grant select on public.places to anon,authenticated;
grant all on public.places to service_role;
create policy "Published places are public" on public.places for select to anon,authenticated using(status='approved');
-- All writes are server-only. Admin membership is checked live by Next.js before a privileged write.
-- Clients cannot assign themselves a role, read pending places, or bypass moderation.

create table public.submission_limits (
 key text primary key,
 window_start timestamptz not null,
 attempts integer not null default 1
);
alter table public.submission_limits enable row level security;
revoke all on public.submission_limits from anon,authenticated;
grant all on public.submission_limits to service_role;

create function public.consume_submission_limit(bucket_key text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare hits integer;
begin
 if char_length(bucket_key)<>64 then raise exception 'invalid bucket'; end if;
 -- The upsert locks the bucket row, so simultaneous requests cannot bypass the limit.
 insert into public.submission_limits(key,window_start,attempts) values(bucket_key,now(),1)
 on conflict(key) do update set
 attempts=case when public.submission_limits.window_start<now()-interval '1 hour' then 1 else public.submission_limits.attempts+1 end,
 window_start=case when public.submission_limits.window_start<now()-interval '1 hour' then now() else public.submission_limits.window_start end
 returning attempts into hits;
 delete from public.submission_limits where window_start<now()-interval '2 days';
 return hits<=5;
end;
$$;
revoke all on function public.consume_submission_limit(text) from public,anon,authenticated;
grant execute on function public.consume_submission_limit(text) to service_role;

create function public.submit_place(place_name text,place_famous_for text,lat double precision,lng double precision,photo text default null) returns uuid
language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
 if lat not between 17.15 and 17.65 or lng not between 78.15 and 78.85 then raise exception 'outside city'; end if;
 -- Serialize same-name suggestions, then compare within 100 metres to catch race-condition duplicates.
 perform pg_advisory_xact_lock(hashtextextended(regexp_replace(lower(place_name),'[^a-z0-9]','','g'),0));
 if exists(select 1 from public.places p where p.status in ('approved','pending') and
 regexp_replace(lower(p.name),'[^a-z0-9]','','g')=regexp_replace(lower(place_name),'[^a-z0-9]','','g') and
 extensions.st_dwithin(p.location::extensions.geography,extensions.st_setsrid(extensions.st_makepoint(lng,lat),4326)::extensions.geography,100))
 then raise exception 'duplicate place'; end if;
 insert into public.places(name,famous_for,latitude,longitude,photo_path,status)
 values(trim(place_name),trim(place_famous_for),lat,lng,photo,'pending') returning id into result;
 return result;
end;
$$;
revoke all on function public.submit_place(text,text,double precision,double precision,text) from public,anon,authenticated;
grant execute on function public.submit_place(text,text,double precision,double precision,text) to service_role;

create function public.explore_places(west double precision,south double precision,east double precision,north double precision,search_text text default '',filter_category text default 'All',filter_dish text default '')
returns setof public.places language sql stable security invoker set search_path='' as $$
 select p.* from public.places p where p.status='approved' and p.city='hyderabad'
 and (filter_category='All' or p.category=filter_category)
 and (filter_dish='' or p.dish=filter_dish)
 and (case when search_text='' then p.location operator(extensions.&&) extensions.st_makeenvelope(west,south,east,north,4326)
 else replace(replace(replace(lower(p.name||' '||p.area||' '||p.category||' '||coalesce(p.dish,'')||' '||p.famous_for),'golconda','golkonda'),'chai','tea'),'biriyani','biryani') like '%'||replace(replace(replace(left(search_text,100),'\\','\\\\'),'%','\\%'),'_','\\_')||'%' end)
 order by p.name limit 301;
$$;
revoke all on function public.explore_places(double precision,double precision,double precision,double precision,text,text,text) from public;
grant execute on function public.explore_places(double precision,double precision,double precision,double precision,text,text,text) to anon,authenticated,service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('place-photos','place-photos',false,3145728,array['image/webp'])
on conflict(id) do nothing;
-- No client Storage policies. Only the server can upload/download; /api/photos checks publication/admin access.
commit;
