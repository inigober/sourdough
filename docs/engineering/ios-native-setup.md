# iOS native app setup

The web app can run as a native iOS shell via [Capacitor](https://capacitorjs.com/). Bake-mode timers use a local `BakeTimer` plugin (`ios/App/App/BakeTimerPlugin.swift`):

- **iOS 26+:** AlarmKit system timers (Lock Screen, dismiss-to-stop alert).
- **Older iOS:** local notification at step end time.

## Prerequisites

1. **Full Xcode** (not Command Line Tools only). Point the active developer directory at Xcode:

   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```

2. **CocoaPods** (installed via Homebrew in this environment: `brew install cocoapods`).

3. Apple Developer account (for running on a physical device; simulator works without paid membership for basic testing).

## First-time setup

```bash
npm install
npm run build:ios
cd ios/App && pod install
npm run cap:open:ios
```

In Xcode:

1. Open `ios/App/App.xcworkspace` (not `.xcodeproj`).
2. Select the **App** target → **Signing & Capabilities**.
3. Choose your Team.
4. For AlarmKit on iOS 26+, add the **AlarmKit** capability when Apple exposes it for your bundle id (may require Xcode 26+).

## Day-to-day workflow

After web changes:

```bash
npm run build:ios
```

Then run from Xcode (⌘R) or:

```bash
npm run cap:open:ios
```

## Deep link

Timer alerts can open bake mode via `sourdough://bake`. The URL scheme is declared in `ios/App/App/Info.plist`.

## Testing bake timers

1. Start a bake and open a timed step.
2. Tap **Start timer** — iOS should prompt for alarm/notification permission on first use.
3. Lock the device — on iOS 26+ you should see a Lock Screen / Dynamic Island countdown (Bake Timer widget extension).
4. Background the app and confirm alert/notification at step end.
5. On iOS 26+ with AlarmKit enabled, confirm dismiss stops the alert and **Open app** returns to bake mode.
6. If permission is denied or only notifications are enabled, bake mode shows a notice with **Open Settings**.

## Widget extension (Phase 4)

The `BakeTimerWidgetExtension` target renders AlarmKit countdown Live Activities on the Lock Screen and Dynamic Island. Shared metadata lives in `BakeTimerShared/BakeTimerAlarmMetadata.swift` and is compiled into both the app and extension targets.

If the extension target is missing after a fresh clone, run:

```bash
cd ios/App && ruby configure_widget_extension.rb
```

## Permission UX (Phase 5)

Bake mode distinguishes three alerting modes:

| Mode | Behavior |
| --- | --- |
| `alarm` | iOS 26+ AlarmKit — lock-screen countdown + dismiss-to-stop alert |
| `notification` | End-of-step notification only (older iOS or alarms denied) |
| `none` | In-app countdown only; notice with Open Settings |

Permission is re-checked when the app returns to the foreground.

## Troubleshooting

| Issue | Fix |
| --- | --- |
| `xcodebuild requires Xcode` | Install Xcode from the App Store; run `xcode-select` command above. |
| Pod install fails | `cd ios/App && pod install --repo-update` |
| Plugin not found (`BakeTimer`) | Confirm `BakeTimerPlugin.swift` is in the App target (already wired in `project.pbxproj`). Rebuild in Xcode. |
| No AlarmKit behavior | Requires iOS 26+ device/simulator and Xcode 26 SDK; older OS uses notifications only. |
