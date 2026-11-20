# Magic 8 Ball

The app behavior runs in the browser and is ready to import from the GitHub Pages UI.

## UI integration

Add the manifest link to the page head.

```html
<link rel="manifest" href="./manifest.webmanifest">
```

Import the module from the root page or adjust the relative path from your script.

```js
import { ask, createShakeDetector, createVoiceInput } from './eight-ball.mjs';
```

- Call `ask(question)` on submission. It returns `null` for blank input or `{ text, tone }` for a random answer. Tone is `positive`, `uncertain`, or `negative`.
- Bind the Ask button and the shake callback to the same submit handler. Read the current question in that handler. Ignore shake callbacks during dictation or while an answer is on screen.
- Create one shake detector with `createShakeDetector(submit)`. Call `enable()` directly from the Enable Shake button click and use its returned status for feedback. Only `enabled` means the motion listener was attached. Call `disable()` when tearing down the UI. Keep the Ask button available if sensor events never arrive.
- Create voice input with `createVoiceInput({ lang, onTranscript, onStatus })`. Set `lang` to the input language or leave it unset to use the browser default. Call `start()` directly from the microphone button click. Copy the final transcript into the editable question field. `onStatus(status, detail)` emits `listening`, `idle`, and `error` with a browser error code. `stop()` finishes capture and `cancel()` discards pending results.
- Keep the text field available for typing or iPhone keyboard dictation. The browser's speech service may require network access.
- Add the final Home Screen icon with the UI assets. After the root `index.html` is merged, set GitHub Pages to publish from `main` and `/(root)`. Open the Pages URL in Safari and use Share → Add to Home Screen.

Test tap, microphone, and shake in Safari and from the installed Home Screen app. Shake thresholds may need tuning on a physical iPhone.
