begin;
-- One canonical place table; generated test data cannot be marked approved.
alter table public.places add column if not exists is_demo boolean not null default false,
 add column if not exists demo_fixture_id text,
 add column if not exists demo_price_inr integer,
 add column if not exists demo_diet text,
 add column if not exists demo_style text,
 add column if not exists demo_opens_at time,
 add column if not exists demo_closes_at time,
 add column if not exists demo_overnight boolean;

alter table public.places drop constraint if exists places_dish_check;
alter table public.places add constraint places_dish_check check
(dish is null or dish in ('Biryani','Punugulu','Samosa','Mandi','Chaat','Dosa','Vada','Tea','Sweets',
'Idli','Haleem','Kebab','Pani Puri','Jalebi','Mirchi Bajji','Osmania Biscuits','Juice','Tiffins','Rolls','Ice Cream'));
alter table public.places add constraint places_demo_unpublished check
(not is_demo or (
 status='pending' and category='Food' and city='hyderabad' and discovery_group='food'
 and source_url is null and listing_verified_at is null and is_hidden_gem=false
 and demo_fixture_id is not null and demo_price_inr is not null
 and demo_diet in ('veg','non_veg') and demo_style is not null
 and demo_opens_at is not null and demo_closes_at is not null and demo_overnight is not null
));
create unique index places_demo_fixture_unique on public.places(demo_fixture_id) where demo_fixture_id is not null;
create policy "Explicit food preview records" on public.places for select to anon,authenticated
 using(is_demo and status='pending');

do $do$
declare
 r record;
 zones jsonb:='[["Charminar",17.3614,78.4744],["Abids",17.3906,78.475],["Koti",17.3865,78.4876],["Secunderabad",17.4399,78.4983],["Himayatnagar",17.405,78.483],["Banjara Hills",17.4122,78.4481],["Jubilee Hills",17.4322,78.4071],["Madhapur",17.4486,78.3908],["Gachibowli",17.4401,78.3489],["Kondapur",17.4608,78.3674],["Mehdipatnam",17.394,78.439],["Tolichowki",17.4056,78.4119],["Begumpet",17.444,78.4624],["Dilsukhnagar",17.3688,78.5247],["Ameerpet",17.4375,78.4483],["Kukatpally",17.4844,78.4071],["Miyapur",17.4966,78.356],["Nizampet",17.518,78.3823],["KPHB",17.4831,78.3898],["Kachiguda",17.3897,78.4951],["Malakpet",17.3712,78.5026],["LB Nagar",17.3464,78.5574],["Uppal",17.4058,78.5591],["Tarnaka",17.429,78.5315],["Habsiguda",17.421,78.5421],["Manikonda",17.4053,78.3863],["Nallagandla",17.469,78.3169],["Attapur",17.3634,78.4289],["Nampally",17.392,78.4669],["Khairatabad",17.41,78.4613],["Sainikpuri",17.4937,78.5435],["Alwal",17.501,78.5066],["Raidurg",17.4369,78.3851],["Rajendranagar",17.32,78.4001],["Nagole",17.377,78.572],["Hitech City",17.4475,78.3762]]'::jsonb;
 z jsonb;
 zi int;
 attempt int;
 a double precision;
 u double precision;
 v double precision;
 rad double precision;
 lat double precision;
 lon double precision;
 collides boolean;
 assigned boolean;
 inserted_count int:=0;
begin
 if (select count(*) from public.food_demo_places)<>600
 or (select count(distinct dish) from public.food_demo_places)<>20 then
  raise exception 'Expected 600 food samples across 20 dishes';
 end if;
 insert into public.places(name,city,category,dish,famous_for,description,area,latitude,longitude,
    status,discovery_group,source_url,listing_verified_at,is_hidden_gem,is_demo,
    demo_fixture_id,demo_price_inr,demo_diet,demo_style,demo_opens_at,demo_closes_at,demo_overnight)
 select d.name,'hyderabad','Food',d.dish,'Known for '||
   case when d.dish='Tea' then 'Irani Chai'
        when d.dish='Juice' then 'Fresh Juices'
        when d.dish='Tiffins' then 'South Indian Tiffins'
        when d.dish='Sweets' then 'Traditional Sweets'
        else d.dish end,
   'Interface-testing location with generated coordinates, name, price and hours. Not a verified restaurant.',
   d.area,d.latitude,d.longitude,'pending','food',null,null,false,true,
   d.id,d.sample_price_inr,d.sample_diet,d.sample_style,d.sample_opens_at,d.sample_closes_at,d.sample_overnight
 from public.food_demo_places d
 on conflict (demo_fixture_id) where demo_fixture_id is not null do nothing;

 for r in select id,demo_fixture_id from public.places where is_demo order by demo_fixture_id
 loop
  zi:=((('x'||substr(md5(r.demo_fixture_id||':zone'),1,8))::bit(32)::bigint)
       % jsonb_array_length(zones))::int;
  z:=zones->zi;
  assigned:=false;
  for attempt in 1..450 loop
    u:=(('x'||substr(md5(r.demo_fixture_id||':'||attempt||':a'),1,8))::bit(32)::bigint)::float8/4294967296.0;
    v:=(('x'||substr(md5(r.demo_fixture_id||':'||attempt||':b'),1,8))::bit(32)::bigint)::float8/4294967296.0;
    a:=2*pi()*u; rad:=250+sqrt(v)*2800;
    lat:=(z->>1)::float8+sin(a)*rad/111195.0;
    lon:=(z->>2)::float8+cos(a)*rad/(111195.0*cos(radians((z->>1)::float8)));
    if lat not between 17.28 and 17.55 or lon not between 78.28 and 78.62 then continue; end if;
    select exists(select 1 from public.places p
      where (not p.is_demo or p.demo_fixture_id<r.demo_fixture_id)
       and abs(p.latitude-lat)<0.0015
       and abs(p.longitude-lon)<0.0015
       and extensions.st_dwithin(
         p.location::extensions.geography,
         extensions.st_setsrid(extensions.st_makepoint(lon,lat),4326)::extensions.geography,120))
      into collides;
    if collides then continue; end if;
    update public.places set latitude=lat,longitude=lon,area=z->>0 where id=r.id;
    assigned:=true;exit;
  end loop;
  if not assigned then raise exception 'Unable to allocate collision-free point %',r.demo_fixture_id;end if;
  inserted_count:=inserted_count+1;
 end loop;
 if inserted_count<>600 or (select count(distinct (latitude,longitude)) from public.places where is_demo)<>600 then
  raise exception 'Incorrect or duplicate sample coordinates';
 end if;
end;
$do$;

-- Enforce exact coordinate uniqueness only AFTER scattering every row.
create unique index places_demo_coordinates_unique on public.places(latitude,longitude) where is_demo;
create index places_demo_lookup_idx on public.places(city,dish,status) where is_demo;

-- Preview reads from public.places, with the same filtering as Famous Food.
-- Security invoker inherits the dedicated preview-row RLS policy.
create function public.explore_demo_food(
 west double precision,south double precision,east double precision,north double precision,
 search_text text default '',filter_dish text default '',filter_budget integer default null,
 filter_hours text default 'any',filter_diet text default 'any',filter_style text default 'any',
 only_hidden_gems boolean default false
) returns setof public.places language sql stable security invoker set search_path=''
as $fn$
select p.* from public.places p
where p.is_demo and p.status='pending' and p.city='hyderabad' and p.category='Food'
 and not only_hidden_gems and west<east and south<north
 and p.location operator(extensions.&&) extensions.st_makeenvelope(west,south,east,north,4326)
 and (search_text='' or position(lower(left(search_text,100)) in
  lower(p.name||' '||p.area||' '||coalesce(p.dish,'')||' '||p.famous_for))>0)
 and (filter_dish='' or p.dish=filter_dish)
 and (filter_budget is null or (filter_budget>=0 and p.demo_price_inr<=filter_budget))
 and (filter_diet='any' or p.demo_diet=filter_diet)
 and (filter_style='any' or p.demo_style=filter_style)
 and (filter_hours='any' or
      (filter_hours='late_night' and p.demo_overnight) or
      (filter_hours='early_morning' and p.demo_opens_at<time '08:00') or
      (filter_hours='open_now' and
       ((not p.demo_overnight and (now() at time zone 'Asia/Kolkata')::time>=p.demo_opens_at
         and (now() at time zone 'Asia/Kolkata')::time<p.demo_closes_at)
        or (p.demo_overnight and (
          (now() at time zone 'Asia/Kolkata')::time>=p.demo_opens_at
          or (now() at time zone 'Asia/Kolkata')::time<p.demo_closes_at)))))
order by row_number() over(partition by p.dish order by
 p.location operator(extensions.<->) extensions.st_setsrid(extensions.st_makepoint((west+east)/2,(south+north)/2),4326),p.name),
 p.dish,p.name limit 180;
$fn$;
revoke all on function public.explore_demo_food(double precision,double precision,double precision,double precision,text,text,integer,text,text,text,boolean) from public;
grant execute on function public.explore_demo_food(double precision,double precision,double precision,double precision,text,text,integer,text,text,text,boolean) to anon,authenticated,service_role;

-- Legitimate suggestions must not be considered duplicates of generated shops.
create or replace function public.submit_place(place_name text,place_famous_for text,lat double precision,lng double precision,photo text default null)
returns uuid language plpgsql security invoker set search_path='' as $fn$
declare result uuid;
begin
 if lat not between 17.15 and 17.65 or lng not between 78.15 and 78.85 then raise exception 'outside city';end if;
 perform pg_advisory_xact_lock(hashtextextended(regexp_replace(lower(place_name),'[^a-z0-9]','','g'),0));
 if exists(select 1 from public.places p where not p.is_demo and p.status in ('approved','pending')
  and regexp_replace(lower(p.name),'[^a-z0-9]','','g')=regexp_replace(lower(place_name),'[^a-z0-9]','','g')
  and extensions.st_dwithin(p.location::extensions.geography,
      extensions.st_setsrid(extensions.st_makepoint(lng,lat),4326)::extensions.geography,100))
 then raise exception 'duplicate place';end if;
 insert into public.places(name,famous_for,latitude,longitude,photo_path,status)
 values(trim(place_name),trim(place_famous_for),lat,lng,photo,'pending') returning id into result;
 return result;
end;
$fn$;

drop table public.food_demo_places;
commit;