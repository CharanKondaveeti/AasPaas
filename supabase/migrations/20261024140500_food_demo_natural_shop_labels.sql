begin;
alter table public.food_demo_places drop constraint if exists food_demo_places_name_check;
alter table public.food_demo_places
 add constraint food_demo_places_natural_name_check
 check (length(btrim(name))>=5 and name !~* '^(demo|sample)\\s');
with brands as (
 select array['Deccan','Safa','Mehfil','Shahi','Royal','Zaiqa','Dil Se','Nawab''s','Masti','Mitti',
 'Charminar Lane','Gully','Zaika','Spice Route','Tadka','Dawat','Chatori','Swaad','Dum','Nukkad',
 'Masala','Riwaayat','Mehmaan','Nimaani','Purani Gali','Angithi','Tandoor','Ruchi','Aangan','Sultani']::text[] as names,
 array['Kitchen','Corner','House','Point','Café','Adda','Express','Bites','Centre','Junction']::text[] as suffixes
),
cats as (
 select unnest(array['Biryani','Punugulu','Tea','Dosa','Mandi','Samosa','Chaat','Vada','Sweets','Idli','Haleem','Kebab','Pani Puri','Jalebi','Mirchi Bajji','Osmania Biscuits','Juice','Tiffins','Rolls','Ice Cream']) as dish,
 generate_series(0,19) as idx
),
labeled as (
 select d.id,
 b.names[(substring(d.id from '([0-9]{2})$'))::int]||' '||
 case when d.dish='Tea' then 'Irani Chai'
      when d.dish='Juice' then 'Juices'
      when d.dish='Kebab' then 'Kebabs'
      when d.dish='Osmania Biscuits' then 'Biscuits'
      when d.dish='Ice Cream' then 'Ice cream'
      else d.dish end||' '||
 b.suffixes[((c.idx+(substring(d.id from '([0-9]{2})$'))::int)%10)+1] as natural_name
 from public.food_demo_places d join cats c on d.dish=c.dish cross join brands b
)
update public.food_demo_places d set name=l.natural_name from labeled l where d.id=l.id;
commit;