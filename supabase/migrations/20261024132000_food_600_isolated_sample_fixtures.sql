begin;
-- Purely fictional fixture records. Never publish through public.places, which contains genuine listings.
create table if not exists public.food_demo_places (
 id text primary key check(id ~ '^demo-food-[a-z0-9-]+-[0-9]{2}$'),
 dish text not null,
 icon_name text not null,
 name text not null check(name like 'SAMPLE %'),
 area text not null,
 latitude double precision not null check(latitude between 17.15 and 17.65),
 longitude double precision not null check(longitude between 78.15 and 78.85),
 sample_price_inr integer not null check(sample_price_inr between 1 and 9999),
 sample_diet text not null check(sample_diet in ('veg','non_veg')),
 sample_style text not null,
 sample_opens_at time not null,
 sample_closes_at time not null,
 sample_overnight boolean not null default false,
 fixture_version integer not null default 1,
 is_demo boolean not null default true check(is_demo = true)
);
alter table public.food_demo_places enable row level security;
revoke all on public.food_demo_places from anon,authenticated;
grant select on public.food_demo_places to service_role;
create index if not exists food_demo_dish_idx on public.food_demo_places(dish);
-- Exactly 20 x 30 = 600 separate sample records; idempotent and deterministic.
with food_categories(dish,icon_name,category_index) as (
 values
    ('Biryani','biryani',0),
    ('Punugulu','punugulu',1),
    ('Tea','chai',2),
    ('Dosa','dosa',3),
    ('Mandi','mandi',4),
    ('Samosa','samosa',5),
    ('Chaat','chaat',6),
    ('Vada','vada',7),
    ('Sweets','sweets',8),
    ('Idli','idli',9),
    ('Haleem','haleem',10),
    ('Kebab','kebab',11),
    ('Pani Puri','pani-puri',12),
    ('Jalebi','jalebi',13),
    ('Mirchi Bajji','mirchi-bajji',14),
    ('Osmania Biscuits','osmania-biscuits',15),
    ('Juice','juice',16),
    ('Tiffins','tiffins',17),
    ('Rolls','rolls',18),
    ('Ice Cream','ice-cream',19)
), sample_areas(area_index,area,lat,lon) as (
 values
    (1,'Charminar',17.3614,78.4744),
    (2,'Abids',17.3906,78.475),
    (3,'Koti',17.3865,78.4876),
    (4,'Secunderabad',17.4399,78.4983),
    (5,'Himayatnagar',17.405,78.483),
    (6,'Banjara Hills',17.4122,78.4481),
    (7,'Jubilee Hills',17.4322,78.4071),
    (8,'Madhapur',17.4486,78.3908),
    (9,'Gachibowli',17.4401,78.3489),
    (10,'Kondapur',17.4608,78.3674),
    (11,'Mehdipatnam',17.394,78.439),
    (12,'Tolichowki',17.4056,78.4119),
    (13,'Begumpet',17.444,78.4624),
    (14,'Dilsukhnagar',17.3688,78.5247),
    (15,'Ameerpet',17.4375,78.4483)
), demo as (
 select
   'demo-food-'||replace(c.icon_name,'_','-')||'-'||lpad(s.n::text,2,'0') id,
   c.dish,c.icon_name,
   'SAMPLE '||c.dish||' Spot '||lpad(s.n::text,2,'0') name,
   a.area,
   a.lat + ((s.n % 5)-2)*0.00175 as latitude,
   a.lon + (((s.n*3+c.category_index) % 7)-3)*0.0021 as longitude,
   25 + ((c.category_index * 13 + s.n*17) % 345) sample_price_inr,
   case when c.dish in ('Biryani','Mandi','Haleem','Kebab') then 'non_veg' else 'veg' end sample_diet,
   (array['street_food','tiffins','breakfast','midnight','iconic','old_favourite','desserts','cafes'])[((c.category_index+s.n)%8)+1] sample_style,
   case when s.n%6=0 then '18:00'::time when s.n%5=0 then '06:30'::time else '10:00'::time end sample_opens_at,
   case when s.n%6=0 then '02:00'::time when s.n%5=0 then '11:30'::time else '22:00'::time end sample_closes_at,
   (s.n%6=0) sample_overnight
 from food_categories c
 cross join generate_series(1,30) as s(n)
 join sample_areas a on a.area_index=((c.category_index*5+s.n-1)%15)+1
)
insert into public.food_demo_places
(id,dish,icon_name,name,area,latitude,longitude,sample_price_inr,sample_diet,sample_style,sample_opens_at,sample_closes_at,sample_overnight)
select id,dish,icon_name,name,area,latitude,longitude,sample_price_inr,sample_diet,sample_style,sample_opens_at,sample_closes_at,sample_overnight from demo
on conflict (id) do update
set dish=excluded.dish, icon_name=excluded.icon_name, name=excluded.name, area=excluded.area,
 latitude=excluded.latitude, longitude=excluded.longitude, sample_price_inr=excluded.sample_price_inr,
 sample_diet=excluded.sample_diet, sample_style=excluded.sample_style,
 sample_opens_at=excluded.sample_opens_at, sample_closes_at=excluded.sample_closes_at,
 sample_overnight=excluded.sample_overnight;
commit;