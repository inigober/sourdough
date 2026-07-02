import SwiftUI
import WidgetKit

#if canImport(AlarmKit)
import AlarmKit

@available(iOS 26.0, *)
struct BakeTimerCountdownText: View {
    let state: AlarmPresentationState

    var body: some View {
        switch state.mode {
        case .countdown(let countdown):
            Text(timerInterval: Date.now ... countdown.fireDate, countsDown: true)
                .monospacedDigit()
                .font(.headline)
        case .paused:
            Text("Paused")
                .font(.headline)
        case .alert:
            Text("Done")
                .font(.headline)
        @unknown default:
            Text("--:--")
                .font(.headline)
        }
    }
}

@available(iOS 26.0, *)
struct BakeTimerLockScreenView: View {
    let stepTitle: String
    let recipeName: String
    let tintColor: Color
    let state: AlarmPresentationState

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "timer")
                    .foregroundStyle(tintColor)
                Text(stepTitle)
                    .font(.headline)
                    .foregroundStyle(tintColor)
                Spacer()
                BakeTimerCountdownText(state: state)
            }
            Text(recipeName)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 4)
    }
}
#endif
