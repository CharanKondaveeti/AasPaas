begin;
-- Existing legacy category values remain intact for backward compatibility.
alter table public.places
  add column if not exists discovery_group text not null default 'experiences'
    check (discovery_group in ('food','experiences','specialty_shops')),
  add column if not exists is_hidden_gem boolean not null default false,
  add column if not exists hidden_gem_reason text,
  add column if not exists listing_verified_at timestamptz,
  add column if not exists verification_notes text;
update public.places
set discovery_group = case
  when category='Food' then 'food'
  when category='Shopping' then 'specialty_shops'
  else 'experiences' end;
alter table public.places
  add constraint places_hidden_gem_evidence check (
    not is_hidden_gem or (
      listing_verified_at is not null
      and char_length(btrim(coalesce(hidden_gem_reason,''))) >= 12
    )
  ),
  add constraint places_verification_evidence check (
    listing_verified_at is null or (
      source_url is not null
      and char_length(btrim(coalesce(verification_notes,''))) >= 15
    )
  ),
  add constraint places_hidden_reason_length check (
    hidden_gem_reason is null or char_length(hidden_gem_reason) <= 300
  ),
  add constraint places_verification_notes_length check (
    verification_notes is null or char_length(verification_notes) <= 700
  );
create index if not exists places_discovery_filter_idx
  on public.places(city,discovery_group,status);
create index if not exists places_hidden_gems_idx
  on public.places(city,discovery_group)
  where status='approved' and is_hidden_gem and listing_verified_at is not null;
-- Separate RPC: old deployed clients keep using explore_places unchanged.
create or replace function public.explore_discoveries(
  west double precision, south double precision,
  east double precision, north double precision,
  search_text text default '',
  filter_category text default 'All',
  filter_dish text default '',
  filter_group text default 'all',
  only_hidden_gems boolean default false
)
returns setof public.places
language sql stable security invoker set search_path=''
as $function$
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
  order by p.name
  limit 301;
$function$;
revoke all on function public.explore_discoveries(double precision,double precision,double precision,double precision,text,text,text,text,boolean)
from public;
grant execute on function public.explore_discoveries(double precision,double precision,double precision,double precision,text,text,text,text,boolean)
to anon, authenticated, service_role;
commit;