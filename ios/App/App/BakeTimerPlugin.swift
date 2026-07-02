import AppIntents
import Capacitor
import Foundation
import UIKit
import UserNotifications

#if canImport(AlarmKit)
import AlarmKit
#endif

@available(iOS 16.0, *)
struct OpenBakeModeIntent: AppIntent {
    static var title: LocalizedStringResource = "Open bake mode"
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        .result()
    }
}

@objc(BakeTimerPlugin)
public class BakeTimerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BakeTimerPlugin"
    public let jsName = "BakeTimer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getPermissionStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelAll", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise),
    ]

    private let storageKey = "sourdough.activeBakeTimerIds"
    private let alarmIdStorageKey = "sourdough.activeBakeAlarmIds"

    @objc func getPermissionStatus(_ call: CAPPluginCall) {
        Task {
            let status = await self.currentPermissionStatus()
            let alertMode = await self.currentAlertMode()
            call.resolve([
                "status": status,
                "alertMode": alertMode,
            ])
        }
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        Task {
            let status = await self.requestAllPermissions()
            let alertMode = await self.currentAlertMode()
            call.resolve([
                "status": status,
                "alertMode": alertMode,
            ])
        }
    }

    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString) else {
                call.reject("Unable to open settings")
                return
            }

            UIApplication.shared.open(url) { accepted in
                if accepted {
                    call.resolve()
                } else {
                    call.reject("Settings could not be opened")
                }
            }
        }
    }

    @objc func schedule(_ call: CAPPluginCall) {
        guard
            let timerId = call.getString("timerId"),
            let endsAtIso = call.getString("endsAtIso"),
            let title = call.getString("title")
        else {
            call.reject("Missing required timer fields")
            return
        }

        let durationSeconds = call.getDouble("durationSeconds") ?? 60
        let recipeName = call.getString("recipeName") ?? "Sourdough bake"
        let body = "\(recipeName) — \(title)"

        Task {
            do {
                if #available(iOS 26.0, *) {
                    #if canImport(AlarmKit)
                    if await self.isAlarmKitAuthorized() {
                        try await self.scheduleAlarmKitTimer(
                            timerId: timerId,
                            durationSeconds: durationSeconds,
                            title: title,
                            recipeName: recipeName
                        )
                        self.trackTimerId(timerId)
                        call.resolve()
                        return
                    }
                    #endif
                }

                try await self.scheduleNotificationTimer(
                    timerId: timerId,
                    endsAtIso: endsAtIso,
                    title: title,
                    body: body
                )
                self.trackTimerId(timerId)
                call.resolve()
            } catch {
                call.reject("Failed to schedule bake timer", nil, error)
            }
        }
    }

    @objc func cancel(_ call: CAPPluginCall) {
        guard let timerId = call.getString("timerId") else {
            call.reject("timerId is required")
            return
        }

        Task {
            await self.cancelTimer(timerId: timerId)
            call.resolve()
        }
    }

    @objc func cancelAll(_ call: CAPPluginCall) {
        Task {
            let timerIds = self.loadTimerIds()
            for timerId in timerIds {
                await self.cancelTimer(timerId: timerId)
            }
            self.saveTimerIds([])
            call.resolve()
        }
    }

    private func currentPermissionStatus() async -> String {
        if #available(iOS 26.0, *) {
            #if canImport(AlarmKit)
            if let alarmStatus = await self.alarmKitPermissionStatus() {
                if alarmStatus == "granted" {
                    return "granted"
                }
                if alarmStatus == "denied" {
                    return "denied"
                }
            }
            #endif
        }

        return await notificationPermissionStatus()
    }

    private func currentAlertMode() async -> String {
        if #available(iOS 26.0, *) {
            #if canImport(AlarmKit)
            if await self.isAlarmKitAuthorized() {
                return "alarm"
            }
            #endif
        }

        let notificationStatus = await notificationPermissionStatus()
        if notificationStatus == "granted" {
            return "notification"
        }

        return "none"
    }

    private func requestAllPermissions() async -> String {
        if #available(iOS 26.0, *) {
            #if canImport(AlarmKit)
            _ = await self.requestAlarmKitPermission()
            #endif
        }

        _ = await self.requestNotificationPermission()
        return await self.currentPermissionStatus()
    }

    private func notificationPermissionStatus() async -> String {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            return "granted"
        case .denied:
            return "denied"
        case .notDetermined:
            return "prompt"
        @unknown default:
            return "prompt"
        }
    }

    private func requestNotificationPermission() async -> Bool {
        do {
            return try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
        } catch {
            return false
        }
    }

    #if canImport(AlarmKit)
    @available(iOS 26.0, *)
    private func alarmKitPermissionStatus() async -> String? {
        let manager = AlarmManager.shared
        switch manager.authorizationState {
        case .authorized:
            return "granted"
        case .denied:
            return "denied"
        case .notDetermined:
            return "prompt"
        @unknown default:
            return "prompt"
        }
    }

    @available(iOS 26.0, *)
    private func isAlarmKitAuthorized() async -> Bool {
        await alarmKitPermissionStatus() == "granted"
    }

    @available(iOS 26.0, *)
    private func requestAlarmKitPermission() async -> Bool {
        do {
            let state = try await AlarmManager.shared.requestAuthorization()
            return state == .authorized
        } catch {
            return false
        }
    }

    @available(iOS 26.0, *)
    private func scheduleAlarmKitTimer(
        timerId: String,
        durationSeconds: Double,
        title: String,
        recipeName: String
    ) async throws {
        let alarmUUID = UUID()
        let stopButton = AlarmButton(
            text: "Dismiss",
            textColor: .white,
            systemImageName: "stop.circle"
        )
        let openButton = AlarmButton(
            text: "Open app",
            textColor: .white,
            systemImageName: "arrow.up.forward.app"
        )
        let alert = AlarmPresentation.Alert(
            title: LocalizedStringResource(stringLiteral: "\(recipeName): \(title)"),
            stopButton: stopButton,
            secondaryButton: openButton,
            secondaryButtonBehavior: .custom
        )
        let pauseButton = AlarmButton(
            text: "Pause",
            textColor: .white,
            systemImageName: "pause.fill"
        )
        let countdown = AlarmPresentation.Countdown(
            title: LocalizedStringResource(stringLiteral: title),
            pauseButton: pauseButton
        )
        let resumeButton = AlarmButton(
            text: "Resume",
            textColor: .white,
            systemImageName: "play.fill"
        )
        let paused = AlarmPresentation.Paused(
            title: "Paused",
            resumeButton: resumeButton
        )
        let presentation = AlarmPresentation(
            alert: alert,
            countdown: countdown,
            paused: paused
        )
        let metadata = BakeTimerAlarmMetadata(stepTitle: title, recipeName: recipeName)
        let attributes = AlarmAttributes(
            presentation: presentation,
            metadata: metadata,
            tintColor: .orange
        )
        let configuration = AlarmManager.AlarmConfiguration.timer(
            duration: durationSeconds,
            attributes: attributes,
            stopIntent: nil,
            secondaryIntent: OpenBakeModeIntent()
        )

        _ = try await AlarmManager.shared.schedule(id: alarmUUID, configuration: configuration)
        self.saveAlarmId(timerId: timerId, alarmUUID: alarmUUID)
    }

    @available(iOS 26.0, *)
    private func cancelAlarmKitTimer(timerId: String) async {
        guard let alarmUUID = self.loadAlarmId(timerId: timerId) else {
            return
        }

        try? AlarmManager.shared.cancel(id: alarmUUID)
        self.removeAlarmId(timerId: timerId)
    }
    #endif

    private func scheduleNotificationTimer(
        timerId: String,
        endsAtIso: String,
        title: String,
        body: String
    ) async throws {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var fireDate = formatter.date(from: endsAtIso)
        if fireDate == nil {
            formatter.formatOptions = [.withInternetDateTime]
            fireDate = formatter.date(from: endsAtIso)
        }
        guard let fireDate else {
            throw NSError(domain: "BakeTimerPlugin", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Invalid endsAtIso value",
            ])
        }

        let content = UNMutableNotificationContent()
        content.title = "\(title) — time's up"
        content.body = body
        content.sound = .default

        let components = Calendar.current.dateComponents(
            [.year, .month, .day, .hour, .minute, .second],
            from: fireDate
        )
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        let request = UNNotificationRequest(identifier: timerId, content: content, trigger: trigger)
        try await UNUserNotificationCenter.current().add(request)
    }

    private func cancelTimer(timerId: String) async {
        if #available(iOS 26.0, *) {
            #if canImport(AlarmKit)
            await self.cancelAlarmKitTimer(timerId: timerId)
            #endif
        }

        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [timerId])
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [timerId])
        self.untrackTimerId(timerId)
    }

    private func trackTimerId(_ timerId: String) {
        var timerIds = self.loadTimerIds()
        timerIds.insert(timerId)
        self.saveTimerIds(timerIds)
    }

    private func untrackTimerId(_ timerId: String) {
        var timerIds = self.loadTimerIds()
        timerIds.remove(timerId)
        self.saveTimerIds(timerIds)
    }

    private func loadTimerIds() -> Set<String> {
        let stored = UserDefaults.standard.stringArray(forKey: storageKey) ?? []
        return Set(stored)
    }

    private func saveTimerIds(_ timerIds: Set<String>) {
        UserDefaults.standard.set(Array(timerIds), forKey: storageKey)
    }

    #if canImport(AlarmKit)
    private func saveAlarmId(timerId: String, alarmUUID: UUID) {
        var stored = UserDefaults.standard.dictionary(forKey: alarmIdStorageKey) as? [String: String] ?? [:]
        stored[timerId] = alarmUUID.uuidString
        UserDefaults.standard.set(stored, forKey: alarmIdStorageKey)
    }

    private func loadAlarmId(timerId: String) -> UUID? {
        let stored = UserDefaults.standard.dictionary(forKey: alarmIdStorageKey) as? [String: String] ?? [:]
        guard let rawValue = stored[timerId] else {
            return nil
        }
        return UUID(uuidString: rawValue)
    }

    private func removeAlarmId(timerId: String) {
        var stored = UserDefaults.standard.dictionary(forKey: alarmIdStorageKey) as? [String: String] ?? [:]
        stored.removeValue(forKey: timerId)
        UserDefaults.standard.set(stored, forKey: alarmIdStorageKey)
    }
    #endif
}
