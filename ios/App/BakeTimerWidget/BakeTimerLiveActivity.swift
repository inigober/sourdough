import SwiftUI
import WidgetKit

#if canImport(AlarmKit)
import AlarmKit

@available(iOS 26.0, *)
struct BakeTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: AlarmAttributes<BakeTimerAlarmMetadata>.self) { context in
            let metadata = context.attributes.metadata
            return BakeTimerLockScreenView(
                stepTitle: metadata?.stepTitle ?? "Timer",
                recipeName: metadata?.recipeName ?? "",
                tintColor: context.attributes.tintColor,
                state: context.state
            )
        } dynamicIsland: { context in
            let metadata = context.attributes.metadata
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(metadata?.stepTitle ?? "Timer")
                            .font(.headline)
                        Text(metadata?.recipeName ?? "")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    BakeTimerCountdownText(state: context.state)
                }
            } compactLeading: {
                Image(systemName: "timer")
                    .foregroundStyle(context.attributes.tintColor)
            } compactTrailing: {
                BakeTimerCountdownText(state: context.state)
            } minimal: {
                Image(systemName: "timer")
            }
        }
    }
}
#endif
