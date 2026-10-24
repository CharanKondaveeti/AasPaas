-- Editorial prominence is display priority, not a star rating.
alter table public.places
 add column if not exists prominence_score smallint not null default 45
   check (prominence_score between 0 and 100),
 add column if not exists prominence_reason text
   check (prominence_reason is null or char_length(prominence_reason) <= 300);

with editorial(name, score) as (values
 ('Charminar',100),('Nimrah Cafe',98),('Golconda Fort',97),
 ('Salar Jung Museum',96),('Hussain',95),('Chowmahalla Palace',94),
 ('Birla Mandir',93),('PullaReddy Sweets',92),
 ('Pista House Arabian Mandi - Attapur',91),
 ('Qutb Shahi Tombs',90),('Buddha Statue',89),
 ('Falaknuma Palace',89),('Durgam Cheruvu',88),
 ('Durgam Cheruvu Cable Bridge',88),('B. M. Birla Planetarium',87),
 ('Cyber Towers',84),('GVK One Mall',82),('Wah Mandi - Kothaguda',80),
 ('Chilkur Balaji Temple',85),('General Bazaar',78),
 ('Samosa Party - Madhapur',73),('Punugulu Shop - Warasiguda',71)
)
update public.places p
set prominence_score=e.score,
    prominence_reason='Initial AasPaas editorial map prominence'
from editorial e where p.name=e.name and p.city='hyderabad' and not p.is_demo;

-- The same ranking engine applies to every place, including preview records.
-- Deterministic test priorities exercise each zoom tier without claiming popularity.
update public.places
set prominence_score=40+(('x'||substr(md5(id::text),1,8))::bit(32)::bigint % 57)::int,
    prominence_reason='Initial map layout priority'
where is_demo;

create index if not exists places_public_prominence_idx
 on public.places (city, prominence_score desc)
 where status='approved';

CREATE OR REPLACE FUNCTION public.explore_demo_food(west double precision, south double precision, east double precision, north double precision, search_text text DEFAULT ''::text, filter_dish text DEFAULT ''::text, filter_budget integer DEFAULT NULL::integer, filter_hours text DEFAULT 'any'::text, filter_diet text DEFAULT 'any'::text, filter_style text DEFAULT 'any'::text, only_hidden_gems boolean DEFAULT false)
 RETURNS SETOF places
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
order by row_number() over(partition by p.dish order by p.prominence_score desc,
 p.location operator(extensions.<->) extensions.st_setsrid(extensions.st_makepoint((west+east)/2,(south+north)/2),4326),p.name),
 p.dish,p.name limit 180;
$function$;

CREATE OR REPLACE FUNCTION public.explore_discoveries(west double precision, south double precision, east double precision, north double precision, search_text text DEFAULT ''::text, filter_category text DEFAULT 'All'::text, filter_dish text DEFAULT ''::text, filter_group text DEFAULT 'all'::text, only_hidden_gems boolean DEFAULT false)
 RETURNS SETOF places
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select p.*
  from public.places p
  where p.status = 'approved'
    and p.city = 'hyderabad'
    and (filter_category = 'All' or p.category = filter_category)
    and (filter_dish = '' or p.dish = filter_dish)
    and (filter_group = 'all' or p.discovery_group = filter_group)
    and (not only_hidden_gems or (p.is_hidden_gem and p.listing_verified_at is not null))
    and (
      case when search_text = '' then
        p.location operator(extensions.&&)
          extensions.st_makeenvelope(west,south,east,north,4326)
      else
        replace(replace(replace(lower(
          p.name||' '||p.area||' '||p.category||' '||
          coalesce(p.dish,'')||' '||p.famous_for
        ),'golconda','golkonda'),'chai','tea'),'biriyani','biryani')
        like '%'||replace(replace(replace(left(search_text,100),'\','\\'),'%','\%'),'_','\_')||'%'
      end
    )
  order by p.prominence_score desc, p.name
  limit 301;
$function$;

CREATE OR REPLACE FUNCTION public.explore_famous_food(west double precision, south double precision, east double precision, north double precision, search_text text DEFAULT ''::text, filter_dish text DEFAULT ''::text, filter_budget integer DEFAULT NULL::integer, filter_hours text DEFAULT 'any'::text, filter_diet text DEFAULT 'any'::text, filter_style text DEFAULT 'any'::text, only_hidden_gems boolean DEFAULT false)
 RETURNS SETOF places
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
order by p.prominence_score desc, p.name limit 301;
$function$;
