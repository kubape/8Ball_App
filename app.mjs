import { ask, createShakeDetector, createVoiceInput } from './eight-ball.mjs';

const app = document.querySelector('.app');
const form = document.querySelector('#question-form');
const question = document.querySelector('#question');
const questionStatus = document.querySelector('#question-status');
const mic = document.querySelector('#mic');
const stage = document.querySelector('#stage');
const card = document.querySelector('#answer-card');
const answer = document.querySelector('#answer');
const result = document.querySelector('#result');
const askedQuestion = document.querySelector('#asked-question');
const reset = document.querySelector('#reset');
const motionButton = document.querySelector('#motion');
const motionLabel = document.querySelector('#motion-label');
const motionStatus = document.querySelector('#motion-status');

function setStatus(target, message = '') {
  target.textContent = message;
  target.hidden = !message;
}

let voiceActive = false;
let voiceFinishing = false;
let voiceFailed = false;

function renderMic() {
  mic.setAttribute('aria-pressed', String(voiceActive));
  mic.setAttribute('aria-label', voiceActive ? 'Stop dictation' : 'Dictate question');
}

const voice = createVoiceInput({
  onTranscript(transcript) {
    question.value = transcript.slice(0, question.maxLength);
    setStatus(questionStatus, 'Question transcribed. You can edit it before asking.');
  },
  onStatus(status, detail) {
    if (status === 'listening' && !voiceFinishing) {
      setStatus(questionStatus, 'Listening…');
    } else if (status === 'error') {
      voiceActive = false;
      voiceFailed = true;
      voiceFinishing = false;
      const messages = {
        'not-allowed': 'Microphone access was denied. Type or use keyboard dictation.',
        'service-not-allowed': 'Voice dictation is unavailable. Type or use keyboard dictation.',
        'no-speech': 'No speech detected. Try again or type your question.',
      };
      setStatus(questionStatus, messages[detail] ?? 'Voice dictation is unavailable. Type or use keyboard dictation.');
    } else if (status === 'idle') {
      voiceActive = false;
      voiceFinishing = false;
      if (!voiceFailed && ['Starting microphone…', 'Listening…', 'Finishing dictation…'].includes(questionStatus.textContent)) {
        setStatus(questionStatus);
      }
    }
    renderMic();
  },
});

if (!voice.supported) {
  mic.disabled = true;
  mic.setAttribute('aria-label', 'Microphone unavailable');
  setStatus(questionStatus, 'Type or use your keyboard’s dictation.');
}

mic.addEventListener('click', () => {
  if (voiceFinishing) return;
  if (voiceActive) {
    voiceFinishing = true;
    setStatus(questionStatus, 'Finishing dictation…');
    voice.stop();
    return;
  }
  question.blur();
  voiceActive = true;
  voiceFailed = false;
  renderMic();
  setStatus(questionStatus, 'Starting microphone…');
  if (!voice.start()) {
    voiceActive = false;
    renderMic();
  }
});

question.addEventListener('input', () => {
  if (voiceActive) voice.cancel();
  if (voice.supported) setStatus(questionStatus);
});

let composing = false;
question.addEventListener('compositionstart', () => { composing = true; });
question.addEventListener('compositionend', () => { composing = false; });
question.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing || composing) return;
  event.preventDefault();
  form.requestSubmit();
});

function submit(source) {
  if (!result.hidden || composing) return;
  if (voiceActive && source === 'shake') return;

  const text = question.value.trim();
  const reply = ask(text);
  if (!reply) {
    if (source === 'tap') {
      setStatus(questionStatus, 'Enter a question first.');
      question.focus();
    }
    return;
  }

  if (voiceActive) voice.cancel();
  question.blur();
  askedQuestion.textContent = text;
  answer.textContent = reply.text;
  card.dataset.tone = reply.tone;
  form.hidden = true;
  result.hidden = false;
  card.hidden = false;
  stage.classList.add('answered');
  updateKeyboard();
  answer.focus();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  submit('tap');
});

reset.addEventListener('click', () => {
  card.hidden = true;
  stage.classList.remove('answered');
  result.hidden = true;
  form.reset();
  setStatus(questionStatus, voice.supported ? '' : 'Type or use your keyboard’s dictation.');
  form.hidden = false;
  question.focus();
});

const shake = createShakeDetector(() => submit('shake'));
let motionEnabled = false;
let motionRequest = 0;

function renderMotion() {
  motionLabel.textContent = motionEnabled ? 'Shake enabled' : 'Enable Shake';
  motionButton.setAttribute('aria-pressed', String(motionEnabled));
}

motionButton.addEventListener('click', async () => {
  if (motionEnabled) {
    shake.disable();
    motionEnabled = false;
    renderMotion();
    setStatus(motionStatus);
    return;
  }

  const request = ++motionRequest;
  motionButton.disabled = true;
  const status = await shake.enable();
  if (request !== motionRequest) return;
  motionButton.disabled = false;
  motionEnabled = status === 'enabled';
  renderMotion();
  const messages = {
    enabled: 'Shake your iPhone or tap Ask.',
    denied: 'Motion access was denied. Tap Ask to get a reply.',
    unsupported: 'Motion is unavailable here. Tap Ask to get a reply.',
    unavailable: 'Motion couldn’t start. Tap Ask to get a reply.',
  };
  setStatus(motionStatus, messages[status]);
});

const viewport = window.visualViewport;
let viewportBeforeFocus = 0;
let widthBeforeFocus = 0;

function updateKeyboard() {
  const height = viewport?.height ?? window.innerHeight;
  const sameOrientation = Math.abs(widthBeforeFocus - window.innerWidth) < 30;
  const touchBaseline = navigator.maxTouchPoints > 0 && sameOrientation ? viewportBeforeFocus : 0;
  const keyboardIsOpen = document.activeElement === question
    && (viewport?.scale ?? 1) < 1.05
    && Math.max(touchBaseline, window.innerHeight) - height > 130;
  app.classList.toggle('keyboard-open', keyboardIsOpen);
}

question.addEventListener('focus', () => {
  widthBeforeFocus = window.innerWidth;
  viewportBeforeFocus = Math.max(window.innerHeight, viewport?.height ?? 0);
  updateKeyboard();
});
question.addEventListener('blur', updateKeyboard);
viewport?.addEventListener('resize', updateKeyboard);
window.addEventListener('resize', updateKeyboard);
window.addEventListener('pagehide', () => {
  voice.cancel();
  shake.disable();
  motionRequest++;
  motionEnabled = false;
  motionButton.disabled = false;
  renderMotion();
  setStatus(motionStatus);
});
