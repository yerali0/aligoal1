# Supabase setup

1. In the Supabase dashboard, open **SQL Editor** and run
   [`supabase/migrations/20260823000000_create_game_data.sql`](supabase/migrations/20260823000000_create_game_data.sql).
   This creates `packs` and `player_cards`, inserts all pack records, enables
   Row Level Security, and permits public read-only access for the game.
2. Copy `.env.example` to `.env.local`, then fill in the project URL,
   publishable key, and service-role key from the dashboard's **Connect** panel.
3. Install dependencies and seed the player rows:

   ```sh
   npm install
   npm run seed:supabase
   ```

`seed:supabase` reads every card from `src/data/players.ts` and sends it to the
SQL `replace_player_cards` function. That function deletes existing card rows
and inserts the current dataset in one transaction. Run it after each
player-data refresh to replace stale data rather than creating duplicates.
The script loads `.env.local` automatically and uses Node 24's built-in
TypeScript support; no separate script runner is needed.

If you ran an earlier version of the migration, run the current migration SQL
again before seeding. It updates the bulk-insert function for databases that
enforce a `WHERE` clause on deletes.

The browser uses only `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY`. `SUPABASE_SERVICE_ROLE_KEY` is used only by
the local seed command; never deploy or expose it in client-side code.
