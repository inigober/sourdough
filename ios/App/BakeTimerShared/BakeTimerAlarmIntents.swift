import Foundation

#if canImport(AlarmKit)
import AlarmKit
import AppIntents

@available(iOS 26.0, *)
struct OpenBakeModeIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Open bake mode"
    static var openAppWhenRun = true

    @Parameter(title: "alarmID")
    var alarmID: String

    init(alarmID: String) {
        self.alarmID = alarmID
    }

    init() {
        self.alarmID = ""
    }

    func perform() async throws -> some IntentResult {
        // Opening the app is the baker's acknowledgment — stop the ringing alert
        // the same way the Stop button does. Otherwise sound continues after unlock.
        guard let id = UUID(uuidString: alarmID) else {
            return .result()
        }
        try AlarmManager.shared.stop(id: id)
        return .result()
    }
}

@available(iOS 26.0, *)
struct StopBakeTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Stop timer"

    @Parameter(title: "alarmID")
    var alarmID: String

    init(alarmID: String) {
        self.alarmID = alarmID
    }

    init() {
        self.alarmID = ""
    }

    func perform() async throws -> some IntentResult {
        guard let id = UUID(uuidString: alarmID) else {
            return .result()
        }
        try AlarmManager.shared.stop(id: id)
        return .result()
    }
}

@available(iOS 26.0, *)
struct ResetBakeTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Reset timer"

    @Parameter(title: "alarmID")
    var alarmID: String

    init(alarmID: String) {
        self.alarmID = alarmID
    }

    init() {
        self.alarmID = ""
    }

    func perform() async throws -> some IntentResult {
        guard let id = UUID(uuidString: alarmID) else {
            return .result()
        }
        try AlarmManager.shared.countdown(id: id)
        return .result()
    }
}
#endif
