import SwiftUI
import WidgetKit

#if canImport(AlarmKit)
import AlarmKit

@available(iOS 26.0, *)
struct BakeTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: AlarmAttributes<BakeTimerAlarmMetadata>.self) { context in
            let stepTitle = context.attributes.metadata?.stepTitle ?? "Timer"
            return BakeTimerLockScreenView(
                stepTitle: stepTitle,
                tintColor: context.attributes.tintColor,
                presentation: context.attributes.presentation,
                state: context.state
            )
        } dynamicIsland: { context in
            let stepTitle = context.attributes.metadata?.stepTitle ?? "Timer"
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(stepTitle)
                        .font(.headline)
                        .lineLimit(2)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    BakeTimerCountdownText(stepTitle: stepTitle, state: context.state)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    BakeTimerLockScreenControls(
                        presentation: context.attributes.presentation,
                        state: context.state,
                        tintColor: context.attributes.tintColor
                    )
                    .padding(.top, 4)
                }
            } compactLeading: {
                Image(systemName: "timer")
                    .foregroundStyle(context.attributes.tintColor)
            } compactTrailing: {
                BakeTimerCountdownText(stepTitle: stepTitle, state: context.state)
                    .font(.caption.weight(.semibold))
            } minimal: {
                Image(systemName: "timer")
                    .foregroundStyle(context.attributes.tintColor)
            }
        }
    }
}
#endif
