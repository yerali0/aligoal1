let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return null;
    audioContext = new AudioContextConstructor();
  }
  return audioContext;
}

function tone(
  frequency: number,
  duration: number,
  startTime: number,
  type: OscillatorType,
  volume: number,
  endFrequency = frequency,
) {
  const context = getAudioContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  oscillator.frequency.linearRampToValueAtTime(endFrequency, startTime + duration);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function schedule(effect: (context: AudioContext, startTime: number) => void) {
  const context = getAudioContext();
  if (!context) return;
  void context.resume().then(() => effect(context, context.currentTime));
}

export function playCorrect() {
  schedule((_, startTime) => {
    tone(660, 0.1, startTime, "triangle", 0.12, 740);
    tone(880, 0.16, startTime + 0.08, "triangle", 0.14, 988);
  });
}

export function playSkip() {
  schedule((_, startTime) => {
    tone(220, 0.18, startTime, "sawtooth", 0.08, 150);
  });
}

export function playWhistle() {
  schedule((_, startTime) => {
    tone(1200, 0.28, startTime, "sine", 0.1, 1750);
    tone(1750, 0.45, startTime + 0.22, "sine", 0.1, 1050);
  });
}

export function primeAudio() {
  const context = getAudioContext();
  if (context) void context.resume();
}
