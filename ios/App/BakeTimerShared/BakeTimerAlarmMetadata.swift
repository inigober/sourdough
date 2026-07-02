import Foundation

#if canImport(AlarmKit)
import AlarmKit

nonisolated struct BakeTimerAlarmMetadata: AlarmMetadata, Codable, Hashable, Sendable {
    var stepTitle: String
    var recipeName: String
}
#endif
