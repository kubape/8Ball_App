# Magic 8 Ball

The app behavior runs in the browser and is ready to import from the GitHub Pages UI.

## Design concepts

- **Dot-Matrix Oracle** uses typewriter lettering and a ball drawn from saturated blue ASCII characters on cream paper. Answers print onto the same blank background. The Home Screen icon carries over the palette and pixelated 8. This is the implemented design.
- **Deep Current** uses a glossy midnight-blue sphere and a floating triangular answer window, like looking through tinted glass. The Home Screen icon would frame an ice-blue triangle in a black orb.
- **Pocket Fortune** uses cobalt and butter yellow, rounded lettering, and stacked cards. The answer appears on a punch-out fortune slip. The Home Screen icon would show a cobalt 8 on a yellow ticket.

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
- Bind the keyboard’s Go or Enter action and the shake callback to the same submit handler. Read the current question in that handler. Ignore shake callbacks during dictation, while a reply is being generated, or while the answer is on screen.
- Create one shake detector with `createShakeDetector(submit, { onImpulse })`. The optional impulse callback can animate the ball as a shake begins. Call `enable()` directly from the Enable Shake button click and use its returned status for feedback. Only `enabled` means the motion listener was attached. Call `disable()` when tearing down the UI. Keep keyboard submission available if sensor events never arrive.
- Create voice input with `createVoiceInput({ lang, onTranscript, onStatus })`. Set `lang` to the input language or leave it unset to use the browser default. Call `start()` directly from the microphone button click. Copy the final transcript into the editable question field. `onStatus(status, detail)` emits `listening`, `idle`, and `error` with a browser error code. `stop()` finishes capture and `cancel()` discards pending results.
- Keep the text field available for typing or iPhone keyboard dictation. The browser's speech service may require network access.
- Add the final Home Screen icon with the UI assets. After the root `index.html` is merged, set GitHub Pages to publish from `main` and `/(root)`. Open the Pages URL in Safari and use Share → Add to Home Screen.

Test keyboard Go, dictation, and shake in Safari and from the installed Home Screen app. Shake thresholds may need tuning on a physical iPhone.
