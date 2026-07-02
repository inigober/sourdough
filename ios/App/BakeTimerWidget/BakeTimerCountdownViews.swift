import SwiftUI
import WidgetKit

#if canImport(AlarmKit)
import AlarmKit

@available(iOS 26.0, *)
private func countdownInterval(
    for countdown: AlarmPresentationState.Mode.Countdown
) -> ClosedRange<Date> {
    let remaining = countdown.totalCountdownDuration - countdown.previouslyElapsedDuration
    let endDate = countdown.startDate.addingTimeInterval(remaining)
    return countdown.startDate ... endDate
}

@available(iOS 26.0, *)
struct BakeTimerCountdownText: View {
    let stepTitle: String
    let state: AlarmPresentationState

    var body: some View {
        switch state.mode {
        case .countdown(let countdown):
            Text(timerInterval: countdownInterval(for: countdown), countsDown: true)
                .monospacedDigit()
                .font(.headline)
                .contentTransition(.numericText())
        case .paused(let paused):
            let remaining = paused.totalCountdownDuration - paused.previouslyElapsedDuration
            Text(formattedDuration(remaining))
                .monospacedDigit()
                .font(.headline)
        case .alert:
            Text(stepTitle)
                .font(.headline)
                .lineLimit(1)
        @unknown default:
            Text("--:--")
                .font(.headline)
        }
    }
}

@available(iOS 26.0, *)
struct BakeTimerLockScreenControls: View {
    let presentation: AlarmPresentation
    let state: AlarmPresentationState
    let tintColor: Color

    private static let resetButton = AlarmButton(
        text: "Reset",
        textColor: .white,
        systemImageName: "arrow.counterclockwise"
    )

    var body: some View {
        HStack(spacing: 12) {
            if case .countdown = state.mode {
                Button(intent: ResetBakeTimerIntent(alarmID: state.alarmID.uuidString)) {
                    controlLabel(Self.resetButton)
                }
                .buttonStyle(.bordered)
                .tint(tintColor.opacity(0.35))
            }

            Button(intent: StopBakeTimerIntent(alarmID: state.alarmID.uuidString)) {
                controlLabel(BakeTimerAlarmButtons.stop)
            }
            .buttonStyle(.bordered)
            .tint(Color.gray.opacity(0.35))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func controlLabel(_ button: AlarmButton) -> some View {
        Label {
            Text(button.text)
        } icon: {
            Image(systemName: button.systemImageName)
        }
        .font(.subheadline.weight(.semibold))
        .labelStyle(.titleAndIcon)
    }
}

@available(iOS 26.0, *)
struct BakeTimerLockScreenView: View {
    let stepTitle: String
    let tintColor: Color
    let presentation: AlarmPresentation
    let state: AlarmPresentationState

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Image(systemName: "timer")
                    .font(.headline)
                    .foregroundStyle(tintColor)
                Text(stepTitle)
                    .font(.headline)
                    .foregroundStyle(tintColor)
                    .lineLimit(1)
                Spacer(minLength: 8)
                BakeTimerCountdownText(stepTitle: stepTitle, state: state)
            }

            BakeTimerLockScreenControls(
                presentation: presentation,
                state: state,
                tintColor: tintColor
            )
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
    }
}

@available(iOS 26.0, *)
private func formattedDuration(_ duration: TimeInterval) -> String {
    let totalSeconds = max(0, Int(duration.rounded()))
    let minutes = totalSeconds / 60
    let seconds = totalSeconds % 60
    return String(format: "%d:%02d", minutes, seconds)
}
#endif
