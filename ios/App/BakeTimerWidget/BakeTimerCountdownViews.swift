import ActivityKit
import SwiftUI

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
    let context: ActivityViewContext<AlarmAttributes<BakeTimerAlarmMetadata>>

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "timer")
                    .foregroundStyle(context.attributes.tintColor)
                Text(context.attributes.metadata.stepTitle)
                    .font(.headline)
                    .foregroundStyle(context.attributes.tintColor)
                Spacer()
                BakeTimerCountdownText(state: context.state)
            }
            Text(context.attributes.metadata.recipeName)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 4)
    }
}
#endif
