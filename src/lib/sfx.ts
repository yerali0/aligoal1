const SOUND_FILES = {
  correct: "/sounds/correct.mp3",
  skip: "/sounds/skip.mp3",
  finish: "/sounds/finish.mp3",
} as const;

const audioCache = new Map<string, HTMLAudioElement>();

function getAudio(src: string) {
  if (typeof window === "undefined") return null;
  let audio = audioCache.get(src);
  if (!audio) {
    audio = new Audio(src);
    audio.preload = "auto";
    audioCache.set(src, audio);
  }
  return audio;
}

function playFile(src: string) {
  const audio = getAudio(src);
  if (!audio) return;
  audio.currentTime = 0;
  void audio.play().catch(() => {
  });
}

export function playCorrect() {
  playFile(SOUND_FILES.correct);
}

export function playSkip() {
  playFile(SOUND_FILES.skip);
}

export function playWhistle() {
  playFile(SOUND_FILES.finish);
}

export function preloadSounds() {
  Object.values(SOUND_FILES).forEach((src) => getAudio(src)?.load());
}

export function primeAudio() {
  preloadSounds();
}
