import SwiftUI
import WidgetKit

#if canImport(AlarmKit)
import AlarmKit

@available(iOS 26.0, *)
struct BakeTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: AlarmAttributes<BakeTimerAlarmMetadata>.self) { context in
            BakeTimerLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(context.attributes.metadata.stepTitle)
                            .font(.headline)
                        Text(context.attributes.metadata.recipeName)
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
