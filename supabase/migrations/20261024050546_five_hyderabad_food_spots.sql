-- Five source-checked Hyderabad food spots: punugulu, mandi and samosas.
-- Source coordinates are official outlet directions or mapped Plus Codes.
-- Insert only missing names; do not alter existing curated or community places.
begin;
alter table public.places drop constraint if exists places_dish_check;
alter table public.places add constraint places_dish_check check
  (dish is null or dish in ('Biryani','Punugulu','Samosa','Mandi','Chaat','Dosa','Vada','Tea','Sweets'));

with candidates(name,category,dish,famous_for,description,area,latitude,longitude,source_url) as (
  values
  (
    'Punugulu Shop - Warasiguda','Food','Punugulu',
    'Fresh punugulu, a popular Telugu fried snack',
    'A small local punugulu stop listed in Warasiguda, Padmarao Nagar. Location is based on its published Plus Code CG99+RM4; check hours before visiting.',
    'Warasiguda · Padmarao Nagar',17.4195125,78.519203125,
    'https://wanderlog.com/place/details/12449302'
  ),
  (
    'Pista House Arabian Mandi - Attapur','Food','Mandi',
    'Arabian-style mandi rice and shared meals',
    'Pista House Arabian Mandi branch at 169 Khayyam Nagar, Rambagh Colony, Attapur; location follows the brand store locator directions.',
    'Khayyam Nagar · Attapur',17.358146367463476,78.42646684388508,
    'https://pistahouse.in/pages/store-locator-1'
  ),
  (
    'Wah Mandi - Kothaguda','Food','Mandi',
    'Chicken mandi and Arabian-style rice platters',
    'Wah Mandi is located on the second floor of Paradigm SSS Square, Kothaguda X Road, opposite AMB Cinemas. Pin references the building location.',
    'Kothaguda · Opposite AMB Cinemas',17.4563875,78.364921875,
    'https://www.wahmandi.com/'
  ),
  (
    'Samosa Party - Sun City','Food','Samosa',
    'Samosa varieties and snack buckets',
    'Samosa Party outlet in Sun City, Hyderabad, offering samosa-based snacks. Coordinates come from the official outlet directions.',
    'Sun City · Hydershakote',17.36657542,78.39839874,
    'https://samosaparty.in/store-locator/hyderabad/samosa-party-sun-city-hyderabad'
  ),
  (
    'Samosa Party - Madhapur','Food','Samosa',
    'Samosas and savoury snack options',
    'Ground-floor Samosa Party outlet at Plot 63, Arunodaya Colony, Madhapur. Coordinates come from the official outlet directions.',
    'Arunodaya Colony · Madhapur',17.44424218,78.3876014,
    'https://samosaparty.in/store-locator/hyderabad/samosa-party-madhapur-hyderabad'
  )
)
insert into public.places(name,city,category,dish,famous_for,description,area,latitude,longitude,source_url,status)
select c.name,'hyderabad',c.category,c.dish,c.famous_for,c.description,c.area,c.latitude,c.longitude,c.source_url,'approved'
from candidates c
where not exists (select 1 from public.places p where lower(p.name) = lower(c.name));
commit;
