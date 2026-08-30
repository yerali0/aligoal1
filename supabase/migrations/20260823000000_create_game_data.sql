-- Kick Off Alias game data
-- Run this in the Supabase SQL Editor, or apply it with the Supabase CLI.

create table if not exists public.packs (
  id text primary key,
  name text not null,
  tagline text not null,
  is_free boolean not null default false,
  ads_required smallint,
  requires_pack_id text references public.packs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packs_ads_required_check check (ads_required is null or ads_required >= 0)
);

create table if not exists public.player_cards (
  id bigint generated always as identity primary key,
  pack_id text not null references public.packs(id) on delete cascade,
  sort_order smallint not null,
  name text not null,
  position text not null,
  club text not null,
  nation text not null,
  flag text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_cards_sort_order_check check (sort_order > 0),
  constraint player_cards_pack_sort_order_key unique (pack_id, sort_order)
);

create index if not exists player_cards_pack_id_sort_order_idx
  on public.player_cards (pack_id, sort_order);

-- Pack definitions are safe to seed directly in SQL. Player cards are seeded
-- by `npm run seed:supabase`, which imports the complete current players.ts
-- dataset and inserts it in batches with a server-only service role key.
insert into public.packs (id, name, tagline, is_free, ads_required, requires_pack_id)
values
  ('top5', 'Top 5 Leagues Mix', 'Europe''s biggest superstars from the top 5 leagues.', true, null, null),
  ('premier', 'Premier League', 'The world''s most competitive league & match winners.', true, null, null),
  ('womens', 'Women''s Football', 'The absolute best stars in the women''s game.', true, null, null),
  ('bundesliga', 'Bundesliga', 'High-octane goals, lethal strikers, and German heavyweights.', false, 3, null),
  ('laliga', 'La Liga', 'Spanish flair, world-class talent, and pure ballers.', false, 3, 'bundesliga'),
  ('seriea', 'Serie A', 'Tactical masterminds, brick-wall defenders, and Italian legends.', false, 3, null),
  ('ligue1', 'Ligue 1', 'Pacy wingers, French giants, and future wonderkids.', false, 3, 'seriea'),
  ('mls', 'MLS', 'Stateside stars, DP icons, and North American talent.', false, 5, null),
  ('legends2000s', '2000s Legends', 'Nostalgic ballers, prime icons, and childhood heroes.', false, 5, null),
  ('worldcup', 'World Cup Icons', 'Tournament legends who defined international football.', false, 5, null)
on conflict (id) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  is_free = excluded.is_free,
  ads_required = excluded.ads_required,
  requires_pack_id = excluded.requires_pack_id,
  updated_at = now();

-- A server-only bulk insert used by the seed command. `cards` is the complete
-- exported players.ts dataset, serialised as JSON by scripts/seed-supabase.ts.
create or replace function public.replace_player_cards(cards jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.player_cards where true;

  insert into public.player_cards (pack_id, sort_order, name, position, club, nation, flag)
  select pack_id, sort_order, name, position, club, nation, flag
  from jsonb_to_recordset(cards) as card(
    pack_id text,
    sort_order smallint,
    name text,
    position text,
    club text,
    nation text,
    flag text
  );
end;
$$;

-- The browser only needs to read game data. All writes go through the seed
-- script (or a trusted server/Edge Function using the service-role key).
revoke all on public.packs, public.player_cards from anon, authenticated;
grant select on public.packs, public.player_cards to anon, authenticated;
revoke all on function public.replace_player_cards(jsonb) from public, anon, authenticated;
grant execute on function public.replace_player_cards(jsonb) to service_role;

alter table public.packs enable row level security;
alter table public.player_cards enable row level security;

drop policy if exists "Public can read packs" on public.packs;
create policy "Public can read packs"
  on public.packs for select to anon, authenticated using (true);

drop policy if exists "Public can read player cards" on public.player_cards;
create policy "Public can read player cards"
  on public.player_cards for select to anon, authenticated using (true);
