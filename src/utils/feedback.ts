// feedback.ts - Lightweight Haptic and Audio Engine

// ─── HAPTICS ───
export const vibrate = (pattern: number | number[]) => {
  if (typeof window !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore if not supported or blocked
    }
  }
};

export const haptic = {
  light: () => vibrate(10),
  medium: () => vibrate(20),
  heavy: () => vibrate(40),
  success: () => vibrate([15, 50, 20]),
  error: () => vibrate([30, 40, 30, 40, 40])
};

// ─── AUDIO (Web Audio API Synthesizer) ───
let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Generic synth function
const playTone = (
  freq: number,
  type: OscillatorType,
  duration: number,
  vol: number = 0.1
) => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Envelope (Attack -> Decay)
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

export const sound = {
  // Soft, satisfying UI pop for tabs and buttons
  pop: () => {
    playTone(350, 'sine', 0.1, 0.1);
    playTone(450, 'sine', 0.15, 0.05); // slight harmonic
  },
  // High pitched glassy clink for the Jar
  clink: () => {
    playTone(1200, 'triangle', 0.3, 0.08);
    playTone(1800, 'sine', 0.3, 0.05);
  },
  // Positive chord for adding income
  success: () => {
    try {
      const ctx = getAudioContext();
      const t = ctx.currentTime;
      [440, 554.37, 659.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0, t + (i * 0.05));
        gain.gain.linearRampToValueAtTime(0.1, t + (i * 0.05) + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + (i * 0.05));
        osc.stop(t + 0.5);
      });
    } catch(e) {}
  },
  // Swipe delete swoosh
  swoosh: () => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch(e) {}
  }
};

export const playFeedback = {
  tap: () => {
    haptic.light();
    sound.pop();
  },
  action: () => {
    haptic.medium();
    sound.clink();
  },
  success: () => {
    haptic.success();
    sound.success();
  },
  delete: () => {
    haptic.heavy();
    sound.swoosh();
  }
};
