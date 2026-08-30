-- Keep existing Supabase projects aligned with the current pack copy.
update public.packs
set tagline = case id
  when 'top5' then 'Europe''s biggest superstars from the top 5 leagues.'
  when 'premier' then 'The world''s most competitive league & match winners.'
  when 'laliga' then 'Spanish flair, world-class talent, and pure ballers.'
  when 'bundesliga' then 'High-octane goals, lethal strikers, and German heavyweights.'
  when 'seriea' then 'Tactical masterminds, brick-wall defenders, and Italian legends.'
  when 'ligue1' then 'Pacy wingers, French giants, and future wonderkids.'
  when 'mls' then 'Stateside stars, DP icons, and North American talent.'
  when 'legends2000s' then 'Nostalgic ballers, prime icons, and childhood heroes.'
  when 'worldcup' then 'Tournament legends who defined international football.'
  when 'womens' then 'The absolute best stars in the women''s game.'
  else tagline
end,
updated_at = now()
where id in ('top5', 'premier', 'laliga', 'bundesliga', 'seriea', 'ligue1', 'mls', 'legends2000s', 'worldcup', 'womens');