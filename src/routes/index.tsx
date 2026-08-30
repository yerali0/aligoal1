import { AdMob, RewardAdPluginEvents, type AdMobRewardItem } from "@capacitor-community/admob";
import { Capacitor } from "@capacitor/core";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  X,
  Timer,
  Trophy,
  RotateCcw,
  Plus,
  Shuffle,
  Target,
  Users,
  ArrowLeft,
  Eye,
  Moon,
  PackageOpen,
  Play,
  ShoppingBag,
  Sparkles,
  Sun,
} from "lucide-react";
import { PACKS, type Player } from "@/data/players";
import { fetchPacks } from "@/lib/packs";
import { cn } from "@/lib/utils";
import { playCorrect, playSkip, playWhistle, preloadSounds, primeAudio } from "@/lib/sfx";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kick Off Alias — Soccer Party Game" },
      {
        name: "description",
        content:
          "Describe the footballer without saying their name. Build teams, beat the clock, and race to the target score with friends.",
      },
      { property: "og:title", content: "Kick Off Alias — Soccer Party Game" },
      {
        property: "og:description",
        content:
          "Describe the footballer without saying their name. Build teams, beat the clock, and race to the target score with friends.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TIMES = [30, 60, 90, 120];
const TARGETS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
const SKINS = [
  { label: "BASE ICON", artwork: "/cards/card-01.svg" },
  { label: "TOTY", artwork: "/cards/card-02.svg" },
  { label: "TOTW", artwork: "/cards/card-03.svg" },
  { label: "FANTASY FC", artwork: "/cards/card-04.svg" },
  { label: "FUTTIES", artwork: "/cards/card-05.svg" },
  { label: "RADIOACTIVE", artwork: "/cards/card-06.svg" },
];

const CLUB_NAMES = [
  "Real Madrid",
  "Barcelona",
  "Manchester City",
  "Liverpool",
  "Arsenal",
  "Bayern Munich",
  "Paris Saint-Germain",
  "Inter Milan",
  "AC Milan",
  "Juventus",
  "Chelsea",
  "Ajax",
  "Borussia Dortmund",
  "Atlético Madrid",
  "Napoli",
  "Benfica",
  "Porto",
  "Boca Juniors",
  "River Plate",
  "Flamengo",
  "Galatasaray",
  "Celtic",
  "Inter Miami",
  "Tottenham Hotspur",
];

type Phase = "teams" | "setup" | "handoff" | "playing" | "standings" | "winner";
type Result = { player: Player; correct: boolean };
type Team = { id: number; name: string; score: number };
type Screen = "menu" | "game" | "packs";

const PACK_UNLOCK_STORAGE_KEY = "kick-off-alias-pack-unlocks";
const PACK_UNLOCK_AD_ID = "ca-app-pub-3940256099942544/5224354917";
const PACK_ARTWORK: Record<string, string> = {
  top5: "/packs/top5.svg",
  premier: "/packs/premier-league.svg",
  laliga: "/packs/laliga.svg",
  seriea: "/packs/serie-a.svg",
  bundesliga: "/packs/bundesliga.svg",
  ligue1: "/packs/ligue-1.svg",
  mls: "/packs/mls.svg",
  womens: "/packs/womens.svg",
  legends2000s: "/packs/legends-2000s.svg",
  worldcup: "/packs/world-cup.svg",
};

function preloadImages(sources: string[]) {
  sources.forEach((source) => {
    const image = new Image();
    image.src = source;
  });
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function randomClub(taken: string[]) {
  const free = CLUB_NAMES.filter((c) => !taken.includes(c));
  const src = free.length ? free : CLUB_NAMES;
  return src[Math.floor(Math.random() * src.length)]!;
}

function Index() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [phase, setPhase] = useState<Phase>("setup");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [inspectedPackId, setInspectedPackId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(60);
  const [target, setTarget] = useState(50);
  const [packIds, setPackIds] = useState<string[]>(["top5"]);
  const [skipPenalty, setSkipPenalty] = useState(false);
  const [packs, setPacks] = useState(PACKS);
  const [adsWatched, setAdsWatched] = useState<Record<string, number>>({});
  const [unlockProgressLoaded, setUnlockProgressLoaded] = useState(false);
  const [watchingPackId, setWatchingPackId] = useState<string | null>(null);
  const [adMode, setAdMode] = useState<"simulate" | null>(null);
  const [adSecondsRemaining, setAdSecondsRemaining] = useState(3);

  useEffect(() => {
    preloadSounds();
    preloadImages([
      ...SKINS.map((skin) => skin.artwork),
      ...Object.values(PACK_ARTWORK),
    ]);
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("aligoal-theme");
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    window.localStorage.setItem("aligoal-theme", theme);
  }, [theme]);

  const [teams, setTeams] = useState<Team[]>([
    { id: 1, name: CLUB_NAMES[0]!, score: 0 },
    { id: 2, name: CLUB_NAMES[1]!, score: 0 },
  ]);

  useEffect(() => {
    const a = randomClub([]);
    setTeams([
      { id: 1, name: a, score: 0 },
      { id: 2, name: randomClub([a]), score: 0 },
    ]);
  }, []);

  useEffect(() => {
    void fetchPacks().then((databasePacks) => {
      // Keep the bundled data as a graceful fallback until the first seed is run.
      if (databasePacks?.some((pack) => pack.players.length > 0)) setPacks(databasePacks);
    });
  }, []);

  useEffect(() => {
    try {
      const savedProgress = window.localStorage.getItem(PACK_UNLOCK_STORAGE_KEY);
      if (savedProgress) setAdsWatched(JSON.parse(savedProgress) as Record<string, number>);
    } catch {
      // The game remains playable if localStorage is unavailable or malformed.
    } finally {
      setUnlockProgressLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!unlockProgressLoaded) return;
    window.localStorage.setItem(PACK_UNLOCK_STORAGE_KEY, JSON.stringify(adsWatched));
  }, [adsWatched, unlockProgressLoaded]);

  useEffect(() => {
    if (!watchingPackId || adMode !== "simulate") return;

    setAdSecondsRemaining(3);
    const countdown = window.setInterval(() => {
      setAdSecondsRemaining((secondsRemaining) => Math.max(0, secondsRemaining - 1));
    }, 1000);
    const finishAd = window.setTimeout(() => {
      const pack = packs.find((item) => item.id === watchingPackId);
      if (pack?.adsRequired) {
        setAdsWatched((watched) => {
          const nextWatched = {
            ...watched,
            [pack.id]: Math.min((watched[pack.id] ?? 0) + 1, pack.adsRequired!),
          };
          try {
            window.localStorage.setItem(PACK_UNLOCK_STORAGE_KEY, JSON.stringify(nextWatched));
          } catch {
            // Ignore localStorage write failures and keep the app playable.
          }
          return nextWatched;
        });
      }
      setWatchingPackId(null);
      setAdMode(null);
      setAdSecondsRemaining(3);
    }, 3000);

    return () => {
      window.clearInterval(countdown);
      window.clearTimeout(finishAd);
    };
  }, [adMode, packs, watchingPackId]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      void AdMob.initialize().catch((error) => {
        console.warn("AdMob initialization failed:", error);
      });
    }
  }, []);
  const [turn, setTurn] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);

  const [deck, setDeck] = useState<Player[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [left, setLeft] = useState(60);
  const [exiting, setExiting] = useState<"up" | "down" | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const exitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [skinOrder, setSkinOrder] = useState<number[]>([]);

  useEffect(
    () => () => {
      if (exitRef.current) clearTimeout(exitRef.current);
      if (holdRef.current) clearTimeout(holdRef.current);
    },
    [],
  );

  const scoreOf = useCallback(
    (rs: Result[]) =>
      rs.filter((r) => r.correct).length -
      (skipPenalty ? rs.filter((r) => !r.correct).length : 0),
    [skipPenalty],
  );

  const pool = useMemo(
    () => packs.filter((p) => packIds.includes(p.id)).flatMap((p) => p.players),
    [packIds, packs],
  );

  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          playWhistle();
          setPhase("standings");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Commit the finished round to the active team's total (once per round).
  const committedRef = useRef(false);
  useEffect(() => {
    if (phase !== "standings") {
      if (phase === "playing") committedRef.current = false;
      return;
    }
    if (committedRef.current) return;
    committedRef.current = true;
    const gained = scoreOf(results);
    setTeams((ts) => ts.map((t, i) => (i === turn ? { ...t, score: t.score + gained } : t)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const roundScore = scoreOf(results);

  const startRound = useCallback(() => {
    try {
      primeAudio();
      setDeck(shuffle(pool));
      setIndex(0);
      setResults([]);
      setLeft(seconds);
      setExiting(null);
      setSkinOrder(shuffle(SKINS.map((_, skinIndex) => skinIndex)));
      setPhase("playing");
    } catch (err) {
      console.error(err);
      // Fail gracefully back to the handoff screen so the app doesn't show
      // the generic error boundary in prod-like environments.
      setPhase("handoff");
    }
  }, [pool, seconds]);

  const newGame = () => {
    setTeams((ts) => ts.map((t) => ({ ...t, score: 0 })));
    setTurn(0);
    setResults([]);
    setPhase("teams");
  };

  const [drag, setDrag] = useState(0);
  const dragStart = useRef<number | null>(null);

  const answer = (correct: boolean) => {
    if (exiting) return;
    const player = deck[index % deck.length];
    if (!player) return;
    if (correct) playCorrect();
    else playSkip();
    setExiting(correct ? "up" : "down");
    exitRef.current = setTimeout(() => {
      setResults((r) => [...r, { player, correct }]);
      setIndex((i) => (i + 1) % (deck.length || 1));
      setDrag(0);
      setExiting(null);
    }, 380);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (exiting) return;
    dragStart.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStart.current === null || exiting) return;
    setDrag(e.clientY - dragStart.current);
  };
  const onPointerUp = () => {
    if (dragStart.current === null) return;
    const dy = drag;
    dragStart.current = null;
    if (dy <= -90) answer(true);
    else if (dy >= 90) answer(false);
    else setDrag(0);
  };

  const isPackUnlocked = useCallback(
    (pack: (typeof packs)[number]): boolean => {
      let currentPack: (typeof packs)[number] | undefined = pack;

      while (true) {
        if (!currentPack) break;
        const packToCheck: (typeof packs)[number] = currentPack;
        const ownUnlockComplete =
          packToCheck.free ||
          !packToCheck.adsRequired ||
          (adsWatched[packToCheck.id] ?? 0) >= packToCheck.adsRequired;
        if (!ownUnlockComplete) return false;
        const requiredPackId: string | undefined = packToCheck.requires;
        currentPack = requiredPackId
          ? packs.find((candidate) => candidate.id === requiredPackId)
          : undefined;
      }

      return true;
    },
    [adsWatched, packs],
  );

  const togglePack = (id: string) => {
    const pack = packs.find((candidate) => candidate.id === id);
    if (!pack || !isPackUnlocked(pack)) return;
    setPackIds((ids) =>
      ids.includes(id) ? (ids.length > 1 ? ids.filter((x) => x !== id) : ids) : [...ids, id],
    );
  };

  const grantPackReward = useCallback(
    (packId: string) => {
      const pack = packs.find((item) => item.id === packId);
      if (!pack?.adsRequired) return;

      setAdsWatched((watched) => {
        const nextWatched = {
          ...watched,
          [pack.id]: Math.min((watched[pack.id] ?? 0) + 1, pack.adsRequired!),
        };
        try {
          window.localStorage.setItem(PACK_UNLOCK_STORAGE_KEY, JSON.stringify(nextWatched));
        } catch {
          // Ignore localStorage write failures and keep the app playable.
        }
        return nextWatched;
      });
    },
    [packs],
  );

  const showPackUnlockAd = useCallback(
    async (pack: (typeof packs)[number]) => {
      if (!pack.adsRequired || watchingPackId || isPackUnlocked(pack)) return;
      const prerequisite = pack.requires ? packs.find((candidate) => candidate.id === pack.requires) : null;
      if (prerequisite && !isPackUnlocked(prerequisite)) return;

      if (!Capacitor.isNativePlatform()) {
        setWatchingPackId(pack.id);
        setAdMode("simulate");
        return;
      }

      setWatchingPackId(pack.id);
      setAdMode(null);

      let rewardListener: Awaited<ReturnType<typeof AdMob.addListener>> | null = null;

      try {
        rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
          void rewardListener?.remove();
          console.log("Pack unlock reward granted", reward);
          grantPackReward(pack.id);
          setWatchingPackId(null);
          setAdMode(null);
        });

        await AdMob.prepareRewardVideoAd({ adId: PACK_UNLOCK_AD_ID });
        await AdMob.showRewardVideoAd();
      } catch (error) {
        console.warn("Pack unlock rewarded ad failed, falling back to simulated ad:", error);
        void rewardListener?.remove();
        setWatchingPackId(pack.id);
        setAdMode("simulate");
      }
    },
    [grantPackReward, isPackUnlocked, watchingPackId],
  );

  const startAd = (pack: (typeof packs)[number]) => {
    void showPackUnlockAd(pack);
  };

  const ownedPacks = packs.filter((pack) => isPackUnlocked(pack));

  const ThemeToggle = () => (
    <button
      type="button"
      onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      className="grid size-11 place-items-center rounded-full border border-border bg-card text-primary shadow-sm transition-transform hover:scale-105"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );

  if (screen === "menu") {
    return (
      <main className="menu-shell mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-10">
        <header className="flex items-start justify-between">
          <div>
            <p className="font-display text-sm tracking-[0.35em] text-primary">AliGoal</p>
            <h1 className="mt-3 max-w-xl text-7xl leading-[0.82] text-glow sm:text-9xl">GUESS THE FOOTBALL STARS</h1>
          </div>
          <ThemeToggle />
        </header>
        <section className="menu-hero mt-auto grid gap-5 pb-6 pt-16 sm:grid-cols-[1.2fr_0.8fr] sm:items-end sm:gap-8">
          <button
            type="button"
            onClick={() => { setScreen("game"); setPhase("setup"); }}
            className="menu-tile menu-tile-play group text-left"
          >
            <span className="flex items-center gap-3 text-primary"><Play className="size-5 fill-current" /> MAIN MATCH</span>
            <span className="mt-10 block font-display text-6xl leading-none sm:text-8xl">PLAY</span>
            <span className="mt-3 block max-w-xs text-sm text-white/65">Test your football IQ, set your timer, and swipe through cards!</span>
            <span className="mt-8 flex items-center gap-2 font-display text-xl text-primary">ENTER GAME <ArrowLeft className="size-5 rotate-180 transition-transform group-hover:translate-x-1" /></span>
          </button>
          <button
            type="button"
            onClick={() => setScreen("packs")}
            className="menu-tile menu-tile-packs group text-left"
          >
            <span className="flex items-center gap-3 text-primary"><ShoppingBag className="size-5" /> PACK SHOP</span>
            <span className="mt-10 block font-display text-6xl leading-none sm:text-8xl">PACKS</span>
            <span className="mt-3 block text-sm text-white/65">Unlock new card packs, leagues, and football icons!</span>
            <span className="mt-8 flex items-center gap-2 font-display text-xl text-primary">BROWSE PACKS <ArrowLeft className="size-5 rotate-180 transition-transform group-hover:translate-x-1" /></span>
          </button>
        </section>
      </main>
    );
  }

  if (screen === "packs") {
    const inspectedPack = packs.find((pack) => pack.id === inspectedPackId);
    return (
      <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <button type="button" onClick={() => setScreen("menu")} className="mb-5 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4" /> MAIN MENU</button>
            <p className="font-display text-sm tracking-[0.35em] text-primary">AliGoal · PACK SHOP</p>
            <h1 className="mt-2 text-6xl leading-none text-glow sm:text-8xl">BUILD YOUR POOL</h1>
            <p className="mt-3 max-w-lg text-sm text-muted-foreground">Unlock leagues, then bring the cards into your next match.</p>
          </div>
        </header>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack, packIndex) => {
            const unlocked = isPackUnlocked(pack);
            const prerequisite = pack.requires ? packs.find((candidate) => candidate.id === pack.requires) : null;
            const prerequisiteUnlocked = !prerequisite || isPackUnlocked(prerequisite);
            const watched = adsWatched[pack.id] ?? 0;
            const required = pack.adsRequired ?? 0;
            return (
              <article key={pack.id} className="shop-pack group rounded-3xl border border-border bg-card p-3 shadow-sm transition-transform hover:-translate-y-1">
                <div className={cn("shop-art", `shop-art-${packIndex % 5}`)}>
                  {PACK_ARTWORK[pack.id] ? (
                    <img src={PACK_ARTWORK[pack.id]} alt={`${pack.name} AliGoal pack`} className="pack-artwork transition-transform group-hover:scale-[1.03]" />
                  ) : (
                    <><Sparkles className="absolute top-4 right-4 size-5 text-white/70" /><PackageOpen className="size-16 text-white/90 transition-transform group-hover:scale-110" strokeWidth={1.25} /></>
                  )}
                </div>
                <div className="px-2 pb-2 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-3xl leading-none">{pack.name}</h2>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{pack.tagline} · {pack.players.length} cards</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/15 px-2 py-1 font-display text-sm text-primary">{pack.free ? "FREE" : `${required} ADS`}</span>
                  </div>
                  <div className="mt-5 flex items-center gap-2">
                    <button type="button" onClick={() => unlocked ? undefined : startAd(pack)} disabled={unlocked || (!prerequisiteUnlocked || Boolean(watchingPackId))} className="flex-1 rounded-xl bg-primary py-3 font-display text-lg text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50">
                      {unlocked
                        ? "OWNED"
                        : watchingPackId === pack.id
                          ? `WATCHING ${adSecondsRemaining}s`
                          : `WATCH AD · ${watched}/${required}`}
                    </button>
                    <button type="button" onClick={() => setInspectedPackId(pack.id)} className="grid size-12 place-items-center rounded-xl border border-border bg-background text-primary transition-colors hover:bg-accent" aria-label={`Inspect ${pack.name}`} title="Inspect pack"><Eye className="size-5" /></button>
                  </div>
                  {!unlocked && !prerequisiteUnlocked && <p className="mt-2 text-xs text-muted-foreground">Unlock {prerequisite?.name} first.</p>}
                </div>
              </article>
            );
          })}
        </div>
        {watchingPackId && adMode === "simulate" && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 px-6 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border border-primary/50 bg-card p-8 text-center shadow-[var(--shadow-glow)]">
              <p className="font-display text-sm tracking-[0.3em] text-primary">ADVERTISEMENT</p>
              <h2 className="mt-3 text-4xl text-glow">WATCH AD</h2>
              <p className="mt-3 text-sm text-muted-foreground">Unlocking {packs.find((pack) => pack.id === watchingPackId)?.name}</p>
              <p className="mt-6 font-display text-7xl text-primary">{adSecondsRemaining}</p>
            </div>
          </div>
        )}
        {inspectedPack && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-background/90 px-5 py-8 backdrop-blur-md sm:grid sm:place-items-center">
            <section className="mx-auto w-full max-w-3xl rounded-3xl border border-border bg-card p-5 shadow-2xl sm:p-8">
              <div className="flex items-start justify-between gap-4"><div><p className="font-display text-sm tracking-[0.25em] text-primary">PACK PREVIEW</p><h2 className="mt-1 text-5xl leading-none">{inspectedPack.name}</h2><p className="mt-2 text-sm text-muted-foreground">{inspectedPack.tagline}</p></div><button type="button" onClick={() => setInspectedPackId(null)} className="grid size-10 place-items-center rounded-full border border-border" aria-label="Close pack inspection"><X className="size-5" /></button></div>
              <div className="mt-6 grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
                {inspectedPack.players.map((player, playerIndex) => playerIndex < 3 ? (
                  <div key={`${inspectedPack.id}-${player.name}`} className="player-preview rounded-2xl border border-border p-3"><div className="flex items-center justify-between"><span className="font-display text-xs tracking-[0.2em] text-primary">PLAYER CARD</span><span className="rounded-md bg-primary/15 px-2 py-1 font-display text-sm text-primary">{player.position}</span></div><p className="mt-8 truncate font-display text-2xl">{player.name}</p><p className="truncate text-xs text-muted-foreground">{player.club}</p><p className="mt-1 text-xs">{player.flag} {player.nation}</p></div>
                ) : (
                  <div key={`${inspectedPack.id}-hidden-${playerIndex}`} className="player-preview player-preview-hidden rounded-2xl border border-border p-3" aria-label="Hidden player card"><span className="font-display text-xs tracking-[0.2em] text-white/60">PLAYER CARD</span><span className="mt-10 block text-center font-display text-2xl text-white/70">HIDDEN</span></div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    );
  }

  /* ---------------- TEAMS ---------------- */
  if (phase === "teams") {
    const startHold = (t: Team) => {
      heldRef.current = false;
      holdRef.current = setTimeout(() => {
        heldRef.current = true;
        setEditingId(t.id);
      }, 2000);
    };
    const endHold = (t: Team) => {
      if (holdRef.current) clearTimeout(holdRef.current);
      if (!heldRef.current && editingId !== t.id) {
        setTeams((ts) =>
          ts.map((x) =>
            x.id === t.id ? { ...x, name: randomClub(ts.map((y) => y.name)) } : x,
          ),
        );
      }
      heldRef.current = false;
    };

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-7 px-5 pt-6 pb-10">
        <header className="flex items-start justify-between">
          <div>
          <p className="font-display text-sm tracking-[0.35em] text-primary">MATCHDAY WORD GAME</p>
          <h1 className="mt-1 text-6xl leading-[0.9] text-glow">
            KICK OFF
            <br />
            ALIAS
          </h1>
          </div>
        </header>
        <button type="button" onClick={() => { setScreen("menu"); setPhase("setup"); }} className="flex w-fit items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> MAIN MENU</button>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-2xl">
            <Users className="size-5 text-primary" /> Your teams
          </h2>
          <div className="flex flex-col gap-2">
            {teams.map((t, i) => (
              <div
                key={t.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-display text-lg text-primary-foreground">
                  {i + 1}
                </span>
                {editingId === t.id ? (
                  <input
                    autoFocus
                    value={t.name}
                    onChange={(e) =>
                      setTeams((ts) =>
                        ts.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)),
                      )
                    }
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingId(null)}
                    maxLength={22}
                    className="min-w-0 rounded-lg bg-secondary px-2 py-1 font-display text-2xl outline-none"
                  />
                ) : (
                  <button
                    onPointerDown={() => startHold(t)}
                    onPointerUp={() => endHold(t)}
                    onPointerLeave={() => holdRef.current && clearTimeout(holdRef.current)}
                    className="min-w-0 truncate text-left font-display text-2xl select-none active:opacity-70"
                  >
                    {t.name}
                  </button>
                )}
                <div className="flex shrink-0 items-center gap-1">
                  <Shuffle className="size-4 text-muted-foreground" />
                  {teams.length > 2 && (
                    <button
                      onClick={() => setTeams((ts) => ts.filter((x) => x.id !== t.id))}
                      className="grid size-7 place-items-center rounded-full border border-border text-muted-foreground"
                      aria-label={`Remove ${t.name}`}
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {teams.length < 5 && (
              <button
                onClick={() =>
                  setTeams((ts) => [
                    ...ts,
                    {
                      id: Math.max(...ts.map((t) => t.id)) + 1,
                      name: randomClub(ts.map((t) => t.name)),
                      score: 0,
                    },
                  ])
                }
                className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/60 py-3 font-display text-xl text-primary"
              >
                <Plus className="size-5" strokeWidth={3} /> ADD TEAM
              </button>
            )}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Tap a team name once to randomise a new club name. Hold the name for 2 seconds to type
            your own. Up to 5 teams.
          </p>
        </section>

        <button
          onClick={() => setPhase("handoff")}
          className="mt-auto w-full rounded-2xl bg-primary py-5 font-display text-3xl text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-[0.98]"
        >
          NEXT · START GAME
        </button>
      </main>
    );
  }

  /* ---------------- SETUP ---------------- */
  if (phase === "setup") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-7 px-5 pt-6 pb-10">
        <header className="flex items-start justify-between">
          <div>
          <p className="font-display text-sm tracking-[0.35em] text-primary">GAME SETTINGS</p>
          <h1 className="mt-1 text-5xl leading-[0.9] text-glow">SET THE RULES</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {teams.map((t) => t.name).join(" · ")}
          </p>
          </div>
        </header>
        <button type="button" onClick={() => setScreen("menu")} className="flex w-fit items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> MAIN MENU</button>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-2xl">
            <Timer className="size-5 text-primary" /> Round length
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {TIMES.map((t) => (
              <button
                key={t}
                onClick={() => setSeconds(t)}
                className={cn(
                  "rounded-xl border border-border bg-card py-3 font-display text-2xl transition-all",
                  seconds === t &&
                    "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-glow)]",
                )}
              >
                {t}s
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-2xl">
            <Target className="size-5 text-primary" /> Points to win
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {TARGETS.map((t) => (
              <button
                key={t}
                onClick={() => setTarget(t)}
                className={cn(
                  "rounded-xl border border-border bg-card py-3 font-display text-2xl transition-all",
                  target === t &&
                    "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-glow)]",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-2xl">Scoring</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { on: false, label: "SKIP = 0", hint: "No penalty" },
              { on: true, label: "SKIP = −1", hint: "Lose a point" },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => setSkipPenalty(opt.on)}
                className={cn(
                  "rounded-xl border border-border bg-card px-3 py-3 text-left transition-all",
                  skipPenalty === opt.on &&
                    "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-glow)]",
                )}
              >
                <span className="block font-display text-2xl leading-none">{opt.label}</span>
                <span
                  className={cn(
                    "block text-xs",
                    skipPenalty === opt.on ? "opacity-80" : "text-muted-foreground",
                  )}
                >
                  {opt.hint}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl">Owned packs</h2>
              <p className="mt-1 text-xs text-muted-foreground">Choose the leagues in your next player pool.</p>
            </div>
            <span className="font-display text-sm text-primary">{packIds.length} SELECTED</span>
          </div>
          {ownedPacks.length > 0 ? (
            <div className="grid gap-2">
              {ownedPacks.map((pack) => {
                const selected = packIds.includes(pack.id);
                return (
                  <button key={pack.id} type="button" onClick={() => togglePack(pack.id)} className={cn("flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-all", selected && "border-primary bg-primary/10 shadow-[var(--shadow-glow)]")}>
                    <span className="min-w-0"><span className="block truncate font-display text-xl">{pack.name}</span><span className="block truncate text-xs text-muted-foreground">{pack.tagline} · {pack.players.length} cards</span></span>
                    <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border", selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>{selected && <Check className="size-4" strokeWidth={3} />}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">No league packs owned yet. Visit Packs to get one.</p>
          )}
        </section>

        <div className="mt-auto grid gap-2">
          <button
            onClick={() => setPhase("teams")}
            className="w-full rounded-2xl bg-primary py-5 font-display text-3xl text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-[0.98]"
          >
            NEXT · TEAM NAMING
          </button>
          <button
            onClick={() => setScreen("menu")}
            className="w-full rounded-2xl border border-border bg-card py-3 font-display text-xl"
          >
            BACK TO MENU
          </button>
        </div>
      </main>
    );
  }

  /* ---------------- HANDOFF ---------------- */
  if (phase === "handoff") {
    const team = teams[turn]!;
    const board = [...teams].sort((a, b) => b.score - a.score);
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-5 text-center">
        <p className="font-display text-sm tracking-[0.35em] text-primary">UP NEXT</p>
        <h1 className="text-6xl leading-[0.9] text-glow">{team.name}</h1>
        <p className="text-sm text-muted-foreground">
          {team.score} / {target} points · {seconds}s round
        </p>

        <section className="w-full text-left">
          <h2 className="mb-2 text-xl">Standings · first to {target}</h2>
          <div className="flex flex-col gap-2">
            {board.map((t, i) => (
              <div
                key={t.id}
                className={cn(
                  "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card px-3 py-2",
                  t.id === team.id && "border-primary/70",
                )}
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary font-display">
                  {i + 1}
                </span>
                <span className="min-w-0 truncate font-display text-xl">{t.name}</span>
                <span className="font-display text-2xl text-primary">{t.score}</span>
              </div>
            ))}
          </div>
        </section>
        <button
          onClick={startRound}
          className="w-full rounded-2xl bg-primary py-6 font-display text-4xl text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-[0.98]"
        >
          START ROUND
        </button>
      </main>
    );
  }

  /* ---------------- PLAYING ---------------- */
  if (phase === "playing") {
    const player = deck[index % deck.length];
    if (!player) return null;
    const urgent = left <= 10;
    const skin = SKINS[(skinOrder[index % skinOrder.length] ?? 0)]!;
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-5 pt-8 pb-8">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <span className="truncate font-display text-2xl text-muted-foreground">
            {teams[turn]!.name} · {roundScore}
          </span>
          <div className="h-2 min-w-0 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000 ease-linear",
                urgent ? "bg-destructive" : "bg-primary",
              )}
              style={{ width: `${(left / seconds) * 100}%` }}
            />
          </div>
          <span
            className={cn(
              "shrink-0 font-display text-4xl tabular-nums",
              urgent ? "animate-pulse text-destructive" : "text-primary",
            )}
          >
            {left}
          </span>
        </div>

        <div
          key={index}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            ...(exiting
              ? {
                  transform: `translateY(${exiting === "up" ? -1400 : 1400}px) rotate(${exiting === "up" ? -6 : 6}deg) scale(0.92)`,
                  opacity: 0,
                  transition:
                    "transform 380ms cubic-bezier(0.22,0.61,0.36,1), opacity 380ms ease-out",
                }
              : {
                  transform: `translateY(${drag}px) rotate(${drag * 0.02}deg)`,
                  transition: dragStart.current === null ? "transform 200ms ease-out" : "none",
                }),
          }}
          className="relative flex aspect-[2/3] w-full touch-none flex-col items-center justify-center text-center select-none"
        >
          <img src={skin.artwork} alt="" aria-hidden="true" className="absolute inset-0 z-0 size-full object-contain" />
          <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-6 py-10 text-slate-900">
            <span
              className={cn(
                "absolute top-1 left-1/2 -translate-x-1/2 rounded-full bg-success px-4 py-1 font-display text-xl text-success-foreground transition-opacity",
                drag < -40 ? "opacity-100" : "opacity-0",
              )}
            >
              GOT IT
            </span>
            <span
              className={cn(
                "absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-destructive px-4 py-1 font-display text-xl text-destructive-foreground transition-opacity",
                drag > 40 ? "opacity-100" : "opacity-0",
              )}
            >
              SKIP
            </span>

            <div className="w-full">
              <p className="font-display text-xs tracking-[0.4em] text-slate-700 opacity-80">EXPLAIN THIS PLAYER</p>
              <h2 className="mt-2 text-[clamp(2.25rem,11vw,3.5rem)] leading-[0.95] font-black uppercase text-slate-950">
                {player.name}
              </h2>
            </div>

            <div className="my-8 h-px w-24 bg-slate-900/25" />

            <dl className="grid w-full grid-cols-3 gap-3 text-slate-900">
              <div>
                <dt className="font-display text-[0.65rem] tracking-widest text-slate-700 opacity-80">POS</dt>
                <dd className="font-display text-3xl text-slate-900">{player.position}</dd>
              </div>
              <div className="min-w-0">
                <dt className="font-display text-[0.65rem] tracking-widest text-slate-700 opacity-80">CLUB</dt>
                <dd className="text-sm leading-tight font-bold text-slate-900">{player.club}</dd>
              </div>
              <div className="min-w-0">
                <dt className="font-display text-[0.65rem] tracking-widest text-slate-700 opacity-80">NATION</dt>
                <dd className="text-sm leading-tight font-bold text-slate-900">
                  <span className="mr-1">{player.flag}</span>
                  {player.nation}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center font-display text-lg">
          <span className="flex items-center justify-center gap-2 rounded-2xl border border-border py-3 text-muted-foreground">
            <X className="size-5 text-destructive" strokeWidth={3} /> SWIPE DOWN
          </span>
          <span className="flex items-center justify-center gap-2 rounded-2xl border border-border py-3 text-muted-foreground">
            <Check className="size-5 text-success" strokeWidth={3} /> SWIPE UP
          </span>
        </div>
      </main>
    );
  }

  /* ------------- STANDINGS / WINNER ------------- */
  const correct = results.filter((r) => r.correct).length;
  const skipped = results.length - correct;
  const ranked = [...teams].sort((a, b) => b.score - a.score);
  const leader = ranked[0]!;
  const winner = leader.score >= target ? leader : null;
  const justPlayed = teams[turn]!;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-5 pt-12 pb-10">
      <header className="text-center">
        <Trophy className="mx-auto size-10 text-primary" />
        {winner ? (
          <>
            <h1 className="mt-3 text-5xl text-glow">{winner.name} WIN!</h1>
            <p className="mt-1 font-display text-7xl leading-none text-primary">{winner.score}</p>
            <p className="text-sm text-muted-foreground">First to {target} points</p>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-5xl text-glow">FULL TIME</h1>
            <p className="mt-1 text-sm text-muted-foreground">{justPlayed.name} scored</p>
            <p className="font-display text-8xl leading-none text-primary">{roundScore}</p>
            <p className="text-sm text-muted-foreground">
              {correct} guessed · {skipped} skipped{skipPenalty ? " (−1 each)" : ""}
            </p>
          </>
        )}
      </header>

      <section className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {results.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
          >
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full",
                r.correct
                  ? "bg-success text-success-foreground"
                  : "bg-destructive text-destructive-foreground",
              )}
            >
              {r.correct ? (
                <Check className="size-4" strokeWidth={3} />
              ) : (
                <X className="size-4" strokeWidth={3} />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-bold">{r.player.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {r.player.position} · {r.player.club}
              </span>
            </span>
            <span className="shrink-0 text-lg">{r.player.flag}</span>
          </div>
        ))}
      </section>

      <div className="grid gap-2">
        {winner ? (
          <button
            onClick={newGame}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-display text-3xl text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-[0.98]"
          >
            <RotateCcw className="size-6" strokeWidth={3} /> NEW GAME
          </button>
        ) : (
          <button
            onClick={() => {
              setTurn((t) => (t + 1) % teams.length);
              setPhase("handoff");
            }}
            className="w-full rounded-2xl bg-primary py-5 font-display text-3xl text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-[0.98]"
          >
            NEXT TEAM · {teams[(turn + 1) % teams.length]!.name}
          </button>
        )}
        <button
          onClick={() => setPhase("setup")}
          className="w-full rounded-2xl border border-border bg-card py-3 font-display text-xl"
        >
          CHANGE SETTINGS
        </button>
      </div>
    </main>
  );
}
