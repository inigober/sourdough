import SwiftUI
import WidgetKit

@main
struct BakeTimerWidgetBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 26.0, *) {
            BakeTimerLiveActivity()
        }
    }
}
