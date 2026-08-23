import { createClient } from "@supabase/supabase-js";
import { PACKS } from "../src/data/players.ts";

// Vite reads .env.local for the browser, but a standalone Node seed script
// does not. Node 20.6+ provides this built-in loader (no extra dotenv package).
try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Missing Supabase credentials. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local before seeding.",
  );
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const packRows = PACKS.map((pack) => ({
  id: pack.id,
  name: pack.name,
  tagline: pack.tagline,
  is_free: Boolean(pack.free),
  ads_required: pack.adsRequired ?? null,
  requires_pack_id: pack.requires ?? null,
}));

const cardRows = PACKS.flatMap((pack) =>
  pack.players.map((player, index) => ({
    pack_id: pack.id,
    sort_order: index + 1,
    ...player,
  })),
);

const { error: packError } = await supabase.from("packs").upsert(packRows);
if (packError) throw packError;

// The SQL function deletes old rows and inserts this complete, current dataset
// in one transaction, preventing stale cards and duplicate pack entries.
const { error: cardError } = await supabase.rpc("replace_player_cards", { cards: cardRows });
if (cardError?.code === "21000") {
  // Supports projects where the first version of the SQL function has already
  // been applied and uses an unqualified DELETE. Run the updated migration to
  // use the transactional RPC path on subsequent seeds.
  const { error: deleteError } = await supabase.from("player_cards").delete().neq("id", 0);
  if (deleteError) throw deleteError;

  for (let start = 0; start < cardRows.length; start += 200) {
    const { error } = await supabase.from("player_cards").insert(cardRows.slice(start, start + 200));
    if (error) throw error;
  }
} else if (cardError) {
  throw cardError;
}

console.log(`Seeded ${packRows.length} packs and ${cardRows.length} player cards.`);
