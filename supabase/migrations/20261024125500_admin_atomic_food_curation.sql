begin;
-- Admin-only atomic replacement of food metadata. The API checks live admin membership.
create or replace function public.save_food_profile(
 place_uuid uuid, dish_rows jsonb, hour_rows jsonb, tag_rows jsonb
) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if jsonb_typeof(dish_rows)<>'array' or jsonb_typeof(hour_rows)<>'array' or jsonb_typeof(tag_rows)<>'array'
    or jsonb_array_length(dish_rows)>30 or jsonb_array_length(hour_rows)>30 or jsonb_array_length(tag_rows)>8
 then raise exception 'Invalid food profile'; end if;
 if not exists(select 1 from public.places p where p.id=place_uuid and p.category='Food')
 then raise exception 'Place not found or not a food listing'; end if;
 -- Entire function runs inside one PostgreSQL transaction.
 delete from public.food_dishes where place_id=place_uuid;
 insert into public.food_dishes(place_id,dish_key,dish_name,is_signature,diet,price_inr,source_url)
 select place_uuid,x.dish_key,x.dish_name,coalesce(x.is_signature,false),
   coalesce(x.diet,'unknown'),x.price_inr,x.source_url
 from jsonb_to_recordset(dish_rows) as x(dish_key text,dish_name text,is_signature boolean,
        diet text,price_inr numeric,source_url text);
 delete from public.food_hours where place_id=place_uuid;
 insert into public.food_hours(place_id,weekday,opens_at,closes_at,overnight,source_url)
 select place_uuid,x.weekday,x.opens_at,x.closes_at,coalesce(x.overnight,false),x.source_url
 from jsonb_to_recordset(hour_rows) as x(weekday smallint,opens_at time,closes_at time,overnight boolean,source_url text);
 delete from public.food_tags where place_id=place_uuid;
 insert into public.food_tags(place_id,tag,source_url)
 select place_uuid,x.tag,x.source_url
 from jsonb_to_recordset(tag_rows) as x(tag text,source_url text);
 return true;
end;$$;
revoke all on function public.save_food_profile(uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_food_profile(uuid,jsonb,jsonb,jsonb) to service_role;
commit;