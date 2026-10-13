import AppIntents
import Foundation

@available(iOS 16.0, *)
struct StartMemoIntent: AppIntent {
  static var title: LocalizedStringResource = "メモ開始"
  static var description = IntentDescription("現在聴いている本に、声でメモを残します。")
  static var openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    let request: [String: Any] = ["id": UUID().uuidString, "createdAt": Date().timeIntervalSince1970]
    UserDefaults.standard.set(request, forKey: "monote.startMemoRequest")
    NSLog("[MONOTE intent] start request queued")
    return .result()
  }
}

@available(iOS 16.0, *)
struct MonoteAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(intent: StartMemoIntent(),
      phrases: ["\(.applicationName)でメモ開始", "\(.applicationName)でメモを開始"],
      shortTitle: "メモ開始", systemImageName: "mic")
  }
}
