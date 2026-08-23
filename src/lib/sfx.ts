import whistleAsset from "@/assets/whistle.mp3.asset.json";
import swipeUpAsset from "@/assets/swipe-up.mp3.asset.json";
import swipeDownAsset from "@/assets/swipe-down.mp3.asset.json";

function make(url: string, volume: number) {
  let el: HTMLAudioElement | null = null;
  return {
    load() {
      if (typeof window === "undefined") return;
      if (!el) {
        el = new Audio(url);
        el.volume = volume;
        el.load();
      }
    },
    play() {
      if (typeof window === "undefined") return;
      this.load();
      if (!el) return;
      el.currentTime = 0;
      void el.play().catch(() => {});
    },
  };
}

const upSfx = make(swipeUpAsset.url, 0.8);
const downSfx = make(swipeDownAsset.url, 0.8);
const whistleSfx = make(whistleAsset.url, 0.7);

export function playCorrect() {
  upSfx.play();
}

export function playSkip() {
  downSfx.play();
}

export function playWhistle() {
  whistleSfx.play();
}

export function primeAudio() {
  upSfx.load();
  downSfx.load();
  whistleSfx.load();
}
