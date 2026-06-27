// js/sound.js

class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.isMuted = false;
    this.volume = 0.5; // default 50%
  }

  init() {
    if (this.audioCtx) return;
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser:", e);
    }
  }

  setVolume(volume) {
    this.volume = parseFloat(volume);
    if (this.masterGain && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  setMute(isMuted) {
    this.isMuted = isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(isMuted ? 0 : this.volume, this.audioCtx.currentTime);
    }
  }

  playOsc(type, freqStart, freqEnd, duration, gainStart = 0.3) {
    this.init();
    if (!this.audioCtx || this.isMuted) return;

    // Resume AudioContext if suspended (browser security autoplay policies)
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const t = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
    }

    gainNode.gain.setValueAtTime(gainStart, t);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  playDrop() {
    // Slumping pitch for physical drop plop
    this.playOsc('sine', 150, 60, 0.25, 0.5);
  }

  playHover() {
    // Very quiet tick
    this.playOsc('sine', 600, 600, 0.04, 0.05);
  }

  playClick() {
    // Fast snappy click
    this.playOsc('triangle', 300, 500, 0.08, 0.15);
  }

  playThemeToggle() {
    // Sweeping ascending sound
    this.playOsc('sine', 200, 450, 0.3, 0.25);
  }

  playUnlock() {
    this.init();
    if (!this.audioCtx || this.isMuted) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

    // Uplifting fast arpeggio
    const notes = [330, 440, 554, 660, 880];
    const t = this.audioCtx.currentTime;
    notes.forEach((freq, index) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + index * 0.06);
      gain.gain.setValueAtTime(0.12, t + index * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + index * 0.06 + 0.25);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + index * 0.06);
      osc.stop(t + index * 0.06 + 0.25);
    });
  }

  playWin() {
    this.init();
    if (!this.audioCtx || this.isMuted) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

    // High energy fanfare chord arpeggio
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    const t = this.audioCtx.currentTime;
    notes.forEach((freq, index) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + index * 0.08);
      gain.gain.setValueAtTime(0.2, t + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + index * 0.08 + 0.4);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + index * 0.08);
      osc.stop(t + index * 0.08 + 0.4);
    });
  }

  playLose() {
    this.init();
    if (!this.audioCtx || this.isMuted) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

    // Depressing descending slide
    const t = this.audioCtx.currentTime;
    const notes = [220, 207.65, 196, 174.61]; // A3, Ab3, G3, F3
    notes.forEach((freq, index) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + index * 0.15);
      gain.gain.setValueAtTime(0.15, t + index * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + index * 0.15 + 0.3);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + index * 0.15);
      osc.stop(t + index * 0.15 + 0.3);
    });
  }

  playDraw() {
    // Alternating neutral tone
    this.playOsc('triangle', 293.66, 293.66, 0.2, 0.15);
    setTimeout(() => {
      this.playOsc('triangle', 220, 220, 0.3, 0.15);
    }, 200);
  }
}

export const sounds = new SoundManager();
