import type { Pack, Player } from "@/data/players";
import { supabase } from "@/lib/supabase";

type PackRow = {
  id: string;
  name: string;
  tagline: string;
  is_free: boolean;
  ads_required: number | null;
  requires_pack_id: string | null;
  player_cards: Array<Player & { sort_order: number }>;
};

/** Fetches the playable packs from Supabase, ordered exactly as seeded. */
export async function fetchPacks(): Promise<Pack[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("packs")
    .select("id, name, tagline, is_free, ads_required, requires_pack_id, player_cards(position, name, club, nation, flag, sort_order)")
    .order("id")
    .order("sort_order", { foreignTable: "player_cards" });

  if (error) {
    console.error("Unable to load player packs from Supabase", error);
    return null;
  }

  return (data as PackRow[]).map((pack) => ({
    id: pack.id,
    name: pack.name,
    tagline: pack.tagline,
    free: pack.is_free,
    adsRequired: pack.ads_required ?? undefined,
    requires: pack.requires_pack_id ?? undefined,
    players: pack.player_cards.map(({ sort_order: _sortOrder, ...player }) => player),
  }));
}
