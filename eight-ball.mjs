const answers = [
  'It is certain.',
  'It is decidedly so.',
  'Without a doubt.',
  'Yes definitely.',
  'You may rely on it.',
  'As I see it, yes.',
  'Most likely.',
  'Outlook good.',
  'Yes.',
  'Signs point to yes.',
  'Reply hazy, try again.',
  'Ask again later.',
  'Better not tell you now.',
  'Cannot predict now.',
  'Concentrate and ask again.',
  'Don’t count on it.',
  'My reply is no.',
  'My sources say no.',
  'Outlook not so good.',
  'Very doubtful.',
];

export function ask(question) {
  if (typeof question !== 'string' || !question.trim()) return null;
  const index = Math.floor(Math.random() * answers.length);
  const tone = index < 10 ? 'positive' : index < 15 ? 'uncertain' : 'negative';
  return { text: answers[index], tone };
}

function vector(sample) {
  if (!sample) return null;
  const values = [sample.x, sample.y, sample.z];
  return values.every(Number.isFinite) ? values : null;
}

export function createShakeDetector(onShake, { onImpulse } = {}) {
  let state = 'idle';
  let previous = null;
  let peak = null;
  let lastShake = -Infinity;
  let generation = 0;

  function onMotion(event) {
    if (document.hidden) {
      previous = peak = null;
      return;
    }

    const now = performance.now();
    const linear = vector(event.acceleration);
    const gravity = vector(event.accelerationIncludingGravity);
    // When linear acceleration is missing, compare nearby samples to cancel gravity.
    const delta = previous && gravity && now - previous.time < 150
      ? gravity.map((value, axis) => value - previous.values[axis])
      : null;
    previous = gravity ? { values: gravity, time: now } : null;

    const force = linear ?? delta;
    if (!force || now - lastShake < 1200 || Math.hypot(...force) < 12) return;
    onImpulse?.();

    // Require impulses in opposing directions within one gesture.
    const opposite = peak && now - peak.time < 350 &&
      force.reduce((dot, value, axis) => dot + value * peak.force[axis], 0) < 0;
    if (!opposite) {
      peak = { force, time: now };
      return;
    }

    lastShake = now;
    peak = null;
    onShake();
  }

  return {
    async enable() {
      if (state === 'enabled' || state === 'pending') return state;
      const Motion = globalThis.DeviceMotionEvent;
      if (!globalThis.isSecureContext || !Motion) return 'unsupported';

      state = 'pending';
      const request = ++generation;
      try {
        const permission = typeof Motion.requestPermission === 'function'
          ? await Motion.requestPermission()
          : 'granted';
        if (request !== generation) return state;
        if (permission !== 'granted') return state = 'denied';

        globalThis.addEventListener('devicemotion', onMotion);
        return state = 'enabled';
      } catch {
        if (request === generation) state = 'unavailable';
        return state;
      }
    },

    disable() {
      generation++;
      globalThis.removeEventListener('devicemotion', onMotion);
      previous = peak = null;
      lastShake = -Infinity;
      state = 'idle';
    },
  };
}

export function createVoiceInput({ lang, onTranscript, onStatus = () => {} }) {
  const Recognition = globalThis.SpeechRecognition ?? globalThis.webkitSpeechRecognition;
  let active = null;

  return {
    supported: typeof Recognition === 'function',

    start() {
      if (active) return false;
      if (typeof Recognition !== 'function') {
        onStatus('error', 'unsupported');
        return false;
      }

      let session;
      try {
        session = new Recognition();
        active = session;
        if (lang) session.lang = lang;
        session.continuous = false;
        session.interimResults = false;

        session.onstart = () => {
          if (active === session) onStatus('listening');
        };
        session.onresult = (event) => {
          if (active !== session) return;
          const transcript = Array.from(event.results)
            .filter((result) => result.isFinal)
            .map((result) => result[0].transcript)
            .join(' ')
            .trim();
          if (transcript) onTranscript(transcript);
        };
        session.onerror = (event) => {
          if (active === session) onStatus('error', event.error);
        };
        session.onend = () => {
          if (active !== session) return;
          active = null;
          onStatus('idle');
        };

        session.start();
        return true;
      } catch (error) {
        active = null;
        onStatus('error', error.name);
        return false;
      }
    },

    stop() {
      active?.stop();
    },

    cancel() {
      if (!active) return;
      const session = active;
      active = null;
      session.abort();
      onStatus('idle');
    },
  };
}
