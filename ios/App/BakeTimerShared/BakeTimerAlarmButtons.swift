import Foundation
import SwiftUI

#if canImport(AlarmKit)
import AlarmKit

@available(iOS 26.0, *)
enum BakeTimerAlarmButtons {
    static let stop = AlarmButton(
        text: "Stop",
        textColor: .white,
        systemImageName: "stop.fill"
    )
}
#endif
