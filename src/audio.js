(function (ns) {
  let ctx = null;
  let muted = false;

  function getContext() {
    if (!ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function playTone(freq, duration, type = 'square', volume = 0.12, delay = 0, slideTo = null) {
    if (muted) return;
    const audio = getContext();
    if (!audio) return;

    const now = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const gain = audio.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + duration);
    }

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(audio.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  ns.Audio = {
    isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    jump() {
      playTone(260, 0.14, 'square', 0.09, 0, 620);
    },
    coin() {
      playTone(988, 0.07, 'square', 0.09, 0);
      playTone(1319, 0.18, 'square', 0.09, 0.07);
    },
    bump() {
      playTone(150, 0.09, 'triangle', 0.14, 0, 90);
    },
    stomp() {
      playTone(340, 0.09, 'sawtooth', 0.11, 0, 120);
    },
    correct() {
      playTone(523.25, 0.09, 'square', 0.1, 0);
      playTone(659.25, 0.09, 'square', 0.1, 0.09);
      playTone(783.99, 0.09, 'square', 0.1, 0.18);
      playTone(1046.5, 0.24, 'square', 0.11, 0.27);
    },
    wrong() {
      playTone(220, 0.14, 'sawtooth', 0.11, 0, 160);
      playTone(165, 0.22, 'sawtooth', 0.11, 0.14, 110);
    },
    pipe() {
      playTone(440, 0.12, 'triangle', 0.12, 0, 180);
      playTone(330, 0.14, 'triangle', 0.12, 0.12, 130);
    },
    heart() {
      playTone(587, 0.08, 'triangle', 0.11, 0);
      playTone(880, 0.18, 'triangle', 0.11, 0.08);
    },
    spring() {
      playTone(280, 0.22, 'triangle', 0.13, 0, 880);
    },
    checkpoint() {
      playTone(523.25, 0.08, 'triangle', 0.1, 0);
      playTone(783.99, 0.14, 'triangle', 0.1, 0.08);
    },
    levelClear() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
      const times = [0, 0.1, 0.2, 0.3, 0.45, 0.58];
      const durs = [0.09, 0.09, 0.09, 0.13, 0.1, 0.35];
      notes.forEach((n, i) => playTone(n, durs[i], 'square', 0.1, times[i]));
    },
    gameOver() {
      playTone(392, 0.18, 'triangle', 0.12, 0);
      playTone(349.23, 0.18, 'triangle', 0.12, 0.18);
      playTone(329.63, 0.18, 'triangle', 0.12, 0.36);
      playTone(261.63, 0.4, 'triangle', 0.13, 0.54);
    }
  };
})((window.MarioMath = window.MarioMath || {}));
