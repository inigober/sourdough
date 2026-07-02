---
title: Native iOS bake timers
status: decided
---

# Native iOS bake timers

## Decision

When the app is packaged as a native iOS app, bake-mode step timers should be started with **one tap** from the existing **Start timer** button in companion/bake mode.

We will **not** try to launch or control the built-in **Clock** app timer. Apple does not expose a supported API or URL scheme for third-party apps to preset and start Clock timers.

Instead:

1. **Keep the current in-app timer** (`activeTimerEndsAt` in bake session state) as the source of truth for schedule drift, step logs, and on-screen countdown while the app is open.
2. **Wrap the web app in Capacitor** when we ship a native iOS shell (natural fit for the existing Vite + React PWA).
3. **Bridge to native timers on Start timer** via a thin Capacitor plugin:
   - **iOS 26+:** [AlarmKit](https://developer.apple.com/videos/play/wwdc2025/230/) for system-level countdown timers (Lock Screen, Dynamic Island, alert on completion).
   - **Older iOS:** `@capacitor/local-notifications` to fire a single “time’s up” notification at the step end time.
4. **Keep native and in-app timers in sync** — cancel, restart, step change, and bake exit must update or clear the matching native alarm/notification.

## User flow

```text
[Start timer] in bake mode
       │
       ├─► startTimedStep()              ← existing JS (session state, drift, logs)
       │
       └─► NativeTimer.schedule()        ← new Capacitor plugin
             ├─ iOS 26+: AlarmKit countdown
             └─ older iOS: local notification at end time
```

Suggested native payload:

| Field | Source |
| --- | --- |
| `id` | Stable per step instance (e.g. bake session id + step id) |
| `durationSeconds` | `step.durationMinutes * 60` |
| `title` | Step label, e.g. `"Bulk ferment"` |
| `subtitle` | Recipe name (optional) |

Permission should be requested in bake mode with clear copy: the baker needs to be alerted when a step ends, even if they leave the app.

## What we are not building

- Opening the Clock app with a preset duration.
- Replacing bake-session timer logic in TypeScript — native timers are a **companion layer**, not a second source of truth.
- Android in the first pass (same JS hook later; separate native implementation).

## Alarm sound and “keep ringing until I stop it”

### AlarmKit (iOS 26+) — target behavior

AlarmKit is designed for cooking timers and wake-up alarms. When a timer fires:

- The alert is **prominent** and **breaks through Silent mode and Focus** (unlike normal notifications).
- The baker must **explicitly dismiss** (or snooze/repeat, if we configure those buttons) — the alert does not auto-clear like a banner notification.
- Audio continues as part of the system alarm experience until the user stops it (same class of behavior as Clock alarms, not a one-shot notification ping).

Sound options:

| Option | Supported? | Notes |
| --- | --- | --- |
| Default AlarmKit system sound | Yes | Used if we omit a custom `sound` parameter. |
| Custom bundled sound | Yes | Via `AlertConfiguration.AlertSound.named("…")`; file must live in the app bundle or `Library/Sounds`. |
| Exact Clock app ringtone (e.g. Radar) | No | Apple does not expose Clock’s tone library to third-party apps. We can pick a similar bundled sound or use the AlarmKit default. |

Apple restrictions and caveats:

- **User opt-in required** — `NSAlarmKitUsageDescription` in Info.plist; the user can deny alarm permission in Settings.
- **Not the Clock app UI** — timers appear as *our* app’s alarms (custom title, our app name on the alert). Behavior is system-level; branding is ours.
- **Custom actions are bounded** — stop, optional snooze/repeat, and optional App Intent buttons (e.g. “Open app”). We cannot invent arbitrary alert chrome; we configure within AlarmKit’s presentation model.
- **Live Activity extension** — for the best Lock Screen / Dynamic Island countdown UI, we likely need a widget extension target. The system can fall back to a default countdown presentation when the Live Activity is unavailable (e.g. shortly after device restart before first unlock).
- **AlarmKit ≠ Critical Alerts** — Apple positions AlarmKit for countdowns and recurring schedules, not as a replacement for the separate Critical Alerts notification entitlement (which is heavily restricted and reviewed).
- **Physical dismiss** — system behavior may allow volume-button dismissal in some alarm contexts (documented in third-party guides; verify during implementation).

**Product intent:** On iOS 26+, bake step completion should feel like a real timer alarm: audible, persistent until dismissed, and visible on the Lock Screen — not a easy-to-miss notification ping.

### Local notifications fallback (pre–iOS 26)

Standard local notifications are **much more restricted**:

- Typically **one short sound**, then done — they do **not** keep ringing until stopped.
- **Respect Silent mode and Focus** unless the app has a rare Critical Alerts entitlement (not appropriate for sourdough timers).
- No Lock Screen countdown UI comparable to AlarmKit.

Use this fallback only for older OS versions. Copy should set expectations: “You’ll get a notification when the step ends” rather than “alarm-style alert.”

## Implementation sketch (future)

### Capacitor plugin interface (TypeScript)

```ts
type NativeBakeTimerRequest = {
  id: string;
  durationSeconds: number;
  title: string;
  recipeName?: string;
};

type NativeBakeTimer = {
  schedule(request: NativeBakeTimerRequest): Promise<void>;
  cancel(id: string): Promise<void>;
  cancelAll(): Promise<void>;
};
```

### Hook point

`CompanionView` → `handleStartStep` / `handleRestartTimer` / step navigation — after updating bake session state, call the native bridge when `Capacitor.isNativePlatform()`.

### Native iOS (AlarmKit)

- Entitlement: AlarmKit (and evaluate whether `critical-wake` is needed; likely not for bake timers).
- Info.plist: `NSAlarmKitUsageDescription`.
- Optional: Widget extension for countdown Live Activity.
- Map `stopIntent` / `secondaryIntent` to return the baker to the app or mark the step ready for advancement.

### Testing checklist

- [ ] Start timer → countdown visible in app and on Lock Screen (iOS 26+).
- [ ] Timer fires with phone locked, Silent on, Focus on.
- [ ] Alert persists until Dismiss; sound stops on dismiss.
- [ ] Restart timer clears previous native alarm and reschedules.
- [ ] Jump step / exit bake cancels native alarm.
- [ ] Denied permission → in-app timer still works; notice with Open Settings.
- [ ] Pre–iOS 26 → end-time notification only; degraded-mode notice shown.
- [ ] Notification-only mode → notice explains difference vs alarm mode.

## Phase 4 — Live Activity (implemented)

- `BakeTimerWidgetExtension` widget target with `BakeTimerLiveActivity`
- Shared `BakeTimerAlarmMetadata` for step title + recipe name
- AlarmKit countdown + paused presentations in `BakeTimerPlugin`
- `NSSupportsLiveActivities` in main app `Info.plist`

## Phase 5 — Permission UX (implemented)

- `alertMode`: `alarm` | `notification` | `none` returned from native plugin
- Contextual notice in bake mode (denied, notification-only)
- **Open Settings** button via `BakeTimer.openSettings()`
- Permission re-checked when app returns to foreground

## References

- [Wake up to the AlarmKit API (WWDC25)](https://developer.apple.com/videos/play/wwdc2025/230/)
- [Scheduling an alarm with AlarmKit](https://developer.apple.com/documentation/alarmkit/scheduling-an-alarm-with-alarmkit)
- [iOS native app setup](./ios-native-setup.md)
- In-app timer today: `src/lib/companion/bakeTimer.ts`, `src/features/companion/CompanionView.tsx`
- JS bridge: `src/lib/companion/nativeBakeTimer/`
- Native plugin: `ios/App/App/BakeTimerPlugin.swift`

## Product decisions (locked)

1. **Permission timing:** ask on first **Start timer** tap in bake mode.
2. **Step jumps:** cancel the previous native timer id; a new step gets a fresh id (`session.id:step.id`).
3. **Open app on dismiss:** AlarmKit secondary action opens `sourdough://bake`; web layer routes to `/bake` and resumes the stashed session when needed.
