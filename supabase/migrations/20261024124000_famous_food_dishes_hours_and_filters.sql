begin;
-- Food data is curated separately from public suggestions; absent evidence means absent facts.
create table if not exists public.food_dishes (
 id uuid primary key default gen_random_uuid(),
 place_id uuid not null references public.places(id) on delete cascade,
 dish_key text not null check(dish_key ~ '^[a-z0-9_-]{2,50}$'),
 dish_name text not null check(char_length(dish_name) between 2 and 80),
 is_signature boolean not null default true,
 diet text not null default 'unknown' check(diet in ('veg','non_veg','egg','unknown')),
 price_inr numeric(8,2) check(price_inr is null or price_inr > 0),
 source_url text not null check(source_url ~ '^https://'),
 verified_at timestamptz not null default now(),
 unique(place_id,dish_key)
);
create table if not exists public.food_hours (
 id uuid primary key default gen_random_uuid(),
 place_id uuid not null references public.places(id) on delete cascade,
 weekday smallint not null check(weekday between 0 and 6),
 opens_at time not null,
 closes_at time not null,
 overnight boolean not null default false,
 source_url text not null check(source_url ~ '^https://'),
 verified_at timestamptz not null default now(),
 check((overnight and closes_at <= opens_at) or (not overnight and closes_at > opens_at)),
 unique(place_id,weekday,opens_at)
);
create table if not exists public.food_tags (
 place_id uuid not null references public.places(id) on delete cascade,
 tag text not null check(tag in ('street_food','tiffins','breakfast','midnight','iconic','old_favourite','desserts','cafes')),
 source_url text not null check(source_url ~ '^https://'),
 verified_at timestamptz not null default now(),
 primary key(place_id,tag)
);
create index if not exists food_dishes_lookup_idx on public.food_dishes(dish_key,price_inr,place_id);
create index if not exists food_hours_lookup_idx on public.food_hours(place_id,weekday);
create index if not exists food_tags_lookup_idx on public.food_tags(tag,place_id);
alter table public.food_dishes enable row level security;
alter table public.food_hours enable row level security;
alter table public.food_tags enable row level security;
revoke all on public.food_dishes,public.food_hours,public.food_tags from anon,authenticated;
grant select on public.food_dishes,public.food_hours,public.food_tags to anon,authenticated;
grant all on public.food_dishes,public.food_hours,public.food_tags to service_role;
create policy "Approved food dishes only" on public.food_dishes for select to anon,authenticated
 using(exists(select 1 from public.places p where p.id=place_id and p.status='approved' and p.category='Food'));
create policy "Approved food hours only" on public.food_hours for select to anon,authenticated
 using(exists(select 1 from public.places p where p.id=place_id and p.status='approved' and p.category='Food'));
create policy "Approved food tags only" on public.food_tags for select to anon,authenticated
 using(exists(select 1 from public.places p where p.id=place_id and p.status='approved' and p.category='Food'));
create or replace function public.explore_famous_food(
 west double precision, south double precision, east double precision, north double precision,
 search_text text default '', filter_dish text default '', filter_budget integer default null,
 filter_hours text default 'any', filter_diet text default 'any', filter_style text default 'any',
 only_hidden_gems boolean default false
) returns setof public.places language sql stable security invoker set search_path='' as $$
select p.* from public.places p
where p.city='hyderabad' and p.category='Food' and p.status='approved'
 and (not only_hidden_gems or (p.is_hidden_gem and p.listing_verified_at is not null))
 and (
  case when search_text='' then p.location operator(extensions.&&) extensions.st_makeenvelope(west,south,east,north,4326)
  else position(lower(left(search_text,100)) in lower(p.name||' '||p.area||' '||coalesce(p.dish,'')||' '||p.famous_for))>0
    or exists(select 1 from public.food_dishes d where d.place_id=p.id and position(lower(left(search_text,100)) in lower(d.dish_name))>0)
  end
 )
 and (filter_dish='' or lower(coalesce(p.dish,''))=lower(filter_dish)
      or exists(select 1 from public.food_dishes d where d.place_id=p.id and d.dish_key=lower(filter_dish)))
 and (filter_budget is null or exists(select 1 from public.food_dishes d
      where d.place_id=p.id and d.price_inr is not null and d.price_inr<=filter_budget))
 and (filter_diet='any' or exists(select 1 from public.food_dishes d
      where d.place_id=p.id and d.diet=filter_diet))
 and (filter_style='any' or exists(select 1 from public.food_tags t
      where t.place_id=p.id and t.tag=filter_style))
 and (
  filter_hours='any'
  or (filter_hours='late_night' and exists(
     select 1 from public.food_hours h where h.place_id=p.id
       and (h.overnight or h.closes_at>time '23:00')))
  or (filter_hours='early_morning' and exists(
     select 1 from public.food_hours h where h.place_id=p.id
       and h.opens_at<time '08:00' and (h.overnight or h.closes_at>time '06:00')))
  or (filter_hours='open_now' and exists(
     select 1 from public.food_hours h where h.place_id=p.id and (
       (h.weekday=extract(dow from (now() at time zone 'Asia/Kolkata'))::int
         and ((not h.overnight and (now() at time zone 'Asia/Kolkata')::time>=h.opens_at
                       and (now() at time zone 'Asia/Kolkata')::time<h.closes_at)
               or (h.overnight and (now() at time zone 'Asia/Kolkata')::time>=h.opens_at)))
       or (h.overnight and h.weekday=(extract(dow from (now() at time zone 'Asia/Kolkata'))::int+6)%7
                  and (now() at time zone 'Asia/Kolkata')::time<h.closes_at)
     )))
 )
order by p.name limit 301;
$$;
revoke all on function public.explore_famous_food(double precision,double precision,double precision,double precision,text,text,integer,text,text,text,boolean) from public;
grant execute on function public.explore_famous_food(double precision,double precision,double precision,double precision,text,text,integer,text,text,text,boolean) to anon,authenticated,service_role;
create or replace function public.famous_food_details(place_uuid uuid) returns jsonb
 language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'dishes',coalesce((select jsonb_agg(jsonb_build_object('dish_key',d.dish_key,'dish_name',d.dish_name,
   'price_inr',d.price_inr,'diet',d.diet,'is_signature',d.is_signature,'verified_at',d.verified_at)
   order by d.is_signature desc,d.dish_name) from public.food_dishes d where d.place_id=p.id),'[]'::jsonb),
 'hours',coalesce((select jsonb_agg(jsonb_build_object('weekday',h.weekday,'opens_at',h.opens_at,
   'closes_at',h.closes_at,'overnight',h.overnight) order by h.weekday,h.opens_at)
   from public.food_hours h where h.place_id=p.id),'[]'::jsonb),
 'tags',coalesce((select jsonb_agg(t.tag order by t.tag) from public.food_tags t where t.place_id=p.id),'[]'::jsonb))
 from public.places p where p.id=place_uuid and p.status='approved' and p.category='Food';
$$;
revoke all on function public.famous_food_details(uuid) from public;
grant execute on function public.famous_food_details(uuid) to anon,authenticated,service_role;
commit;