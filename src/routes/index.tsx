import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  X,
  LockKeyhole,
  Timer,
  Trophy,
  RotateCcw,
  Plus,
  Shuffle,
  Target,
  Users,
} from "lucide-react";
import { PACKS, type Player } from "@/data/players";
import { fetchPacks } from "@/lib/packs";
import { cn } from "@/lib/utils";
import { playCorrect, playSkip, playWhistle, primeAudio } from "@/lib/sfx";

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
  { cls: "fc-skin-gold", label: "BASE ICON" },
  { cls: "fc-skin-toty", label: "TOTY" },
  { cls: "fc-skin-totw", label: "TOTW" },
  { cls: "fc-skin-fof", label: "FANTASY FC" },
  { cls: "fc-skin-futties", label: "FUTTIES" },
  { cls: "fc-skin-radioactive", label: "RADIOACTIVE" },
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

const PACK_UNLOCK_STORAGE_KEY = "kick-off-alias-pack-unlocks";

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
  const [phase, setPhase] = useState<Phase>("teams");
  const [seconds, setSeconds] = useState(60);
  const [target, setTarget] = useState(50);
  const [packIds, setPackIds] = useState<string[]>(["top5"]);
  const [skipPenalty, setSkipPenalty] = useState(false);
  const [packs, setPacks] = useState(PACKS);
  const [adsWatched, setAdsWatched] = useState<Record<string, number>>({});
  const [unlockProgressLoaded, setUnlockProgressLoaded] = useState(false);
  const [watchingPackId, setWatchingPackId] = useState<string | null>(null);
  const [adSecondsRemaining, setAdSecondsRemaining] = useState(3);

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
    if (!watchingPackId) return;

    setAdSecondsRemaining(3);
    const countdown = window.setInterval(() => {
      setAdSecondsRemaining((secondsRemaining) => Math.max(0, secondsRemaining - 1));
    }, 1000);
    const finishAd = window.setTimeout(() => {
      const pack = packs.find((item) => item.id === watchingPackId);
      if (pack?.adsRequired) {
        setAdsWatched((watched) => ({
          ...watched,
          [pack.id]: Math.min((watched[pack.id] ?? 0) + 1, pack.adsRequired!),
        }));
      }
      setWatchingPackId(null);
    }, 3000);

    return () => {
      window.clearInterval(countdown);
      window.clearTimeout(finishAd);
    };
  }, [packs, watchingPackId]);
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
  const [skinSeed, setSkinSeed] = useState(0);

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
      setSkinSeed(Math.floor(Math.random() * 1000));
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

      while (currentPack) {
        const ownUnlockComplete =
          currentPack.free ||
          !currentPack.adsRequired ||
          (adsWatched[currentPack.id] ?? 0) >= currentPack.adsRequired;
        if (!ownUnlockComplete) return false;
        currentPack = currentPack.requires
          ? packs.find((candidate) => candidate.id === currentPack.requires)
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

  const startAd = (pack: (typeof packs)[number]) => {
    if (!pack.adsRequired || watchingPackId || isPackUnlocked(pack)) return;
    const prerequisite = pack.requires ? packs.find((candidate) => candidate.id === pack.requires) : null;
    if (prerequisite && !isPackUnlocked(prerequisite)) return;
    setWatchingPackId(pack.id);
  };

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
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-7 px-5 pt-12 pb-10">
        <header>
          <p className="font-display text-sm tracking-[0.35em] text-primary">MATCHDAY WORD GAME</p>
          <h1 className="mt-1 text-6xl leading-[0.9] text-glow">
            KICK OFF
            <br />
            ALIAS
          </h1>
        </header>

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
          onClick={() => setPhase("setup")}
          className="mt-auto w-full rounded-2xl bg-primary py-5 font-display text-3xl text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-[0.98]"
        >
          NEXT · SETTINGS
        </button>
      </main>
    );
  }

  /* ---------------- SETUP ---------------- */
  if (phase === "setup") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-7 px-5 pt-12 pb-10">
        <header>
          <p className="font-display text-sm tracking-[0.35em] text-primary">GAME SETTINGS</p>
          <h1 className="mt-1 text-5xl leading-[0.9] text-glow">SET THE RULES</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {teams.map((t) => t.name).join(" · ")}
          </p>
        </header>

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
          <h2 className="mb-3 text-2xl">Card packs</h2>
          <div className="flex flex-col gap-2">
            {packs.map((p) => {
              const on = packIds.includes(p.id);
              const unlocked = isPackUnlocked(p);
              const prerequisite = p.requires ? packs.find((candidate) => candidate.id === p.requires) : null;
              const prerequisiteUnlocked = !prerequisite || isPackUnlocked(prerequisite);
              const watched = adsWatched[p.id] ?? 0;
              const required = p.adsRequired ?? 0;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "rounded-2xl border border-border bg-card p-3 transition-all",
                    on && "border-primary/70 shadow-[var(--shadow-glow)]",
                    !unlocked && "border-muted-foreground/40 opacity-80",
                  )}
                >
                  <button
                    type="button"
                    disabled={!unlocked}
                    onClick={() => togglePack(p.id)}
                    className={cn(
                      "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1 text-left",
                      unlocked ? "cursor-pointer" : "cursor-not-allowed",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-display text-2xl">{p.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {p.tagline} · {p.players.length} cards
                      </span>
                    </span>
                    {unlocked ? (
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-full border",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-success/70 bg-success/15 text-success",
                        )}
                        aria-label={on ? "Selected" : "Unlocked"}
                      >
                        {on ? <Check className="size-4" strokeWidth={3} /> : <CheckCircle2 className="size-4" />}
                      </span>
                    ) : (
                      <LockKeyhole className="size-5 shrink-0 text-muted-foreground" aria-label="Locked" />
                    )}
                  </button>

                  {!unlocked && (
                    <div className="mt-3 border-t border-border pt-3">
                      {prerequisiteUnlocked ? (
                        <button
                          type="button"
                          onClick={() => startAd(p)}
                          disabled={Boolean(watchingPackId)}
                          className="w-full rounded-xl bg-primary py-2 font-display text-base text-primary-foreground disabled:cursor-wait disabled:opacity-60"
                        >
                          WATCH AD TO UNLOCK ({watched}/{required} WATCHED)
                        </button>
                      ) : (
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          <LockKeyhole className="size-3" /> Unlock {prerequisite?.name} first
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-auto grid gap-2">
          <button
            onClick={() => setPhase("handoff")}
            className="w-full rounded-2xl bg-primary py-5 font-display text-3xl text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-[0.98]"
          >
            KICK OFF · {pool.length} CARDS
          </button>
          <button
            onClick={() => setPhase("teams")}
            className="w-full rounded-2xl border border-border bg-card py-3 font-display text-xl"
          >
            BACK TO TEAMS
          </button>
        </div>

        {watchingPackId && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 px-6 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border border-primary/50 bg-card p-8 text-center shadow-[var(--shadow-glow)]">
              <p className="font-display text-sm tracking-[0.3em] text-primary">ADVERTISEMENT</p>
              <h2 className="mt-3 text-4xl text-glow">WATCHING AD...</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Unlocking {packs.find((pack) => pack.id === watchingPackId)?.name}
              </p>
              <p className="mt-6 font-display text-7xl text-primary">{adSecondsRemaining}</p>
            </div>
          </div>
        )}
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
    const skin = SKINS[(index + skinSeed) % SKINS.length]!;
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
            boxShadow: "var(--shadow-card)",
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
          className={cn(
            skin.cls,
            "relative flex flex-1 touch-none flex-col items-center justify-center rounded-3xl px-6 py-10 text-center select-none",
          )}
        >
          <span className="absolute top-3 left-4 font-display text-[0.6rem] tracking-[0.3em] opacity-70">
            {skin.label}
          </span>
          <span
            className={cn(
              "absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-success px-4 py-1 font-display text-xl text-success-foreground transition-opacity",
              drag < -40 ? "opacity-100" : "opacity-0",
            )}
          >
            GOT IT
          </span>
          <span
            className={cn(
              "absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-destructive px-4 py-1 font-display text-xl text-destructive-foreground transition-opacity",
              drag > 40 ? "opacity-100" : "opacity-0",
            )}
          >
            SKIP
          </span>

          <div className="w-full">
            <p className="font-display text-xs tracking-[0.4em] opacity-60">EXPLAIN THIS PLAYER</p>
            <h2 className="mt-2 text-[clamp(2.25rem,11vw,3.5rem)] leading-[0.95] font-black uppercase">
              {player.name}
            </h2>
          </div>

          <div className="my-8 h-px w-24 bg-current opacity-25" />

          <dl className="grid w-full grid-cols-3 gap-3">
            <div>
              <dt className="font-display text-[0.65rem] tracking-widest opacity-60">POS</dt>
              <dd className="font-display text-3xl">{player.position}</dd>
            </div>
            <div className="min-w-0">
              <dt className="font-display text-[0.65rem] tracking-widest opacity-60">CLUB</dt>
              <dd className="text-sm leading-tight font-bold">{player.club}</dd>
            </div>
            <div className="min-w-0">
              <dt className="font-display text-[0.65rem] tracking-widest opacity-60">NATION</dt>
              <dd className="text-sm leading-tight font-bold">
                <span className="mr-1">{player.flag}</span>
                {player.nation}
              </dd>
            </div>
          </dl>
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
