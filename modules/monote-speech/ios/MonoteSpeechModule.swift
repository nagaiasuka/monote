import ExpoModulesCore
import AVFoundation
import Speech
import UIKit

private final class SpeechFeedbackDelegate: NSObject, AVSpeechSynthesizerDelegate {
  var onEnd: (() -> Void)?
  func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) { onEnd?() }
  func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) { onEnd?() }
}

public class MonoteSpeechModule: Module {
  private var engine: AVAudioEngine?
  private var task: SFSpeechRecognitionTask?
  private var request: SFSpeechAudioBufferRecognitionRequest?
  private var recognizer: SFSpeechRecognizer?
  private var timer: Timer?
  private var observers: [NSObjectProtocol] = []
  private var draft: [String: String]?
  private var started = Date()
  private var lastSound = Date()
  private var commandSince: Date?
  private var commandBody: String?
  private var silenceSeconds: Double = 5
  private var silenceEnabled = true
  private var active = false
  private var finishing = false
  private var starting = false
  private var tapInstalled = false
  private var generation = UUID()
  private var lastLevelEvent = Date.distantPast
  private var stopReason = "manual"
  private var stopError = ""
  private let synth = AVSpeechSynthesizer()
  private let feedbackDelegate = SpeechFeedbackDelegate()

  public func definition() -> ModuleDefinition {
    Name("MonoteSpeech")
    Events("onTranscript", "onLevel", "onEnd")
    OnCreate {
      self.synth.delegate = self.feedbackDelegate
      self.feedbackDelegate.onEnd = { [weak self] in
        DispatchQueue.main.async {
          guard let self, !self.active && !self.starting && !self.finishing else { return }
          try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        }
      }
    }
    AsyncFunction("status") { () -> [String: Any] in
      let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "ja-JP"))
      return ["onDevice": recognizer?.supportsOnDeviceRecognition ?? false,
              "speech": SFSpeechRecognizer.authorizationStatus().rawValue,
              "microphone": AVAudioSession.sharedInstance().recordPermission.rawValue]
    }.runOnQueue(.main)
    AsyncFunction("start") { (id: String, bookId: String, createdAt: String, silenceEnabled: Bool, silenceSeconds: Double, promise: Promise) in
      guard !self.active && !self.starting && !self.finishing else {
        promise.reject("busy", "音声入力はすでに開始しています。"); return
      }
      self.starting = true
      self.synth.stopSpeaking(at: .immediate)
      guard UIApplication.shared.applicationState == .active else {
        self.starting = false
        promise.reject("inactive", "音声入力を開始するにはアプリを開く必要があります。"); return
      }
      SFSpeechRecognizer.requestAuthorization { status in
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
          DispatchQueue.main.async {
            defer { self.starting = false }
            guard status == .authorized && granted else {
              promise.reject("permission", "マイクと音声認識の許可が必要です。iPhoneの設定から変更できます。"); return
            }
            do {
              try self.begin(id: id, bookId: bookId, createdAt: createdAt, silenceEnabled: silenceEnabled, silenceSeconds: silenceSeconds)
              promise.resolve()
            } catch {
              self.cleanup()
              promise.reject("speech", error.localizedDescription)
            }
          }
        }
      }
    }.runOnQueue(.main)
    AsyncFunction("stop") { self.finish(reason: "manual") }.runOnQueue(.main)
    AsyncFunction("recover") { () -> [[String: String]] in
      let directory = try self.draftDirectory()
      return try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)
        .filter { $0.pathExtension == "json" }
        .compactMap { url in
          guard let data = try? Data(contentsOf: url) else { return nil }
          return try? JSONDecoder().decode([String: String].self, from: data)
        }
    }.runOnQueue(.main)
    AsyncFunction("discard") { (id: String) in
      guard UUID(uuidString: id) != nil else { return }
      let url = try self.draftDirectory().appendingPathComponent(id + ".json")
      if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
    }.runOnQueue(.main)
    AsyncFunction("announce") { (text: String) throws in
      guard !self.active && !self.starting && !self.finishing else { return }
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.playback, mode: .spokenAudio, options: [.mixWithOthers, .duckOthers])
      try session.setActive(true)
      let utterance = AVSpeechUtterance(string: text)
      utterance.voice = AVSpeechSynthesisVoice(language: "ja-JP")
      self.synth.speak(utterance)
    }.runOnQueue(.main)
    OnDestroy {
      DispatchQueue.main.async { self.synth.stopSpeaking(at: .immediate); self.cleanup() }
    }
  }

  private func begin(id: String, bookId: String, createdAt: String, silenceEnabled: Bool, silenceSeconds: Double) throws {
    guard UIApplication.shared.applicationState == .active else { throw failure("アプリが非アクティブになりました。再度お試しください。") }
    guard UUID(uuidString: id) != nil, UUID(uuidString: bookId) != nil else { throw failure("下書き情報が不正です。") }
    guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "ja-JP")), recognizer.supportsOnDeviceRecognition else {
      throw failure("この端末では日本語のオンデバイス音声認識を利用できません。音声は送信していません。テキストメモをご利用ください。")
    }
    guard recognizer.isAvailable else { throw failure("音声認識を現在利用できません。少し待ってからお試しください。") }
    self.recognizer = recognizer
    generation = UUID()
    let currentGeneration = generation
    self.silenceEnabled = silenceEnabled
    self.silenceSeconds = max(3, min(15, silenceSeconds))
    draft = ["id": id, "book_id": bookId, "content": "", "created_at": createdAt, "updated_at": createdAt]
    try checkpoint()
    let session = AVAudioSession.sharedInstance()
    // Do not mix audiobook audio into the microphone. Deactivation is only a resume hint.
    try session.setCategory(.playAndRecord, mode: .measurement, options: [.allowBluetooth, .defaultToSpeaker])
    try session.setActive(true)
    let engine = AVAudioEngine()
    self.engine = engine
    let request = SFSpeechAudioBufferRecognitionRequest()
    request.requiresOnDeviceRecognition = true
    request.shouldReportPartialResults = true
    self.request = request
    let input = engine.inputNode
    let format = input.outputFormat(forBus: 0)
    guard format.sampleRate > 0 && format.channelCount > 0 else { throw failure("マイクの接続を確認してください。") }
    input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self, weak request] buffer, _ in
      request?.append(buffer)
      guard let samples = buffer.floatChannelData?[0] else { return }
      let count = Int(buffer.frameLength)
      guard count > 0 else { return }
      var sum: Float = 0
      for index in 0..<count { sum += samples[index] * samples[index] }
      let rms = sqrt(sum / Float(count))
      DispatchQueue.main.async {
        guard let self, self.generation == currentGeneration, self.active && !self.finishing else { return }
        if rms > 0.012 { self.lastSound = Date() }
        if Date().timeIntervalSince(self.lastLevelEvent) >= 0.08 {
          self.lastLevelEvent = Date()
          self.sendEvent("onLevel", ["level": min(1, rms * 12)])
        }
      }
    }
    tapInstalled = true
    active = true
    finishing = false
    started = Date(); lastSound = started; commandSince = nil; commandBody = nil
    task = recognizer.recognitionTask(with: request) { [weak self] result, error in
      DispatchQueue.main.async {
        guard let self, self.generation == currentGeneration, self.active else { return }
        if let result {
          if !self.finishing || self.stopReason != "command" {
            self.draft?["content"] = result.bestTranscription.formattedString
          }
          if !self.finishing {
            let words = result.bestTranscription.segments.map { SpeechWord(text: $0.substring, start: $0.timestamp, duration: $0.duration) }
            if let body = StopCommand.bodyIfCommand(words) {
              if self.commandBody != body { self.commandSince = Date() }
              self.commandBody = body
            } else { self.commandBody = nil; self.commandSince = nil }
          }
          do { try self.checkpoint() } catch { self.finish(reason: "error", error: "下書きの保存に失敗しました。") }
          self.sendEvent("onTranscript", ["content": self.draft?["content"] ?? ""])
          if result.isFinal {
            if !self.finishing {
              if let body = self.commandBody {
                self.draft?["content"] = body
                self.finish(reason: "command")
              } else { self.finish(reason: "recognizerEnded") }
            }
            self.complete()
          }
        }
        if let error {
          if !self.finishing { self.finish(reason: "error", error: error.localizedDescription) }
          self.complete()
        }
      }
    }
    engine.prepare()
    try engine.start()
    observers = [
      NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] note in
        if (note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt) == AVAudioSession.InterruptionType.began.rawValue {
          self?.finish(reason: "interrupted", error: "音声入力が中断されました。認識できた内容を保護します。")
        }
      },
      NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
        self?.finish(reason: "background", error: "アプリがバックグラウンドに移動したため音声入力を終了しました。")
      },
      NotificationCenter.default.addObserver(forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main) { [weak self] _ in
        self?.finish(reason: "routeChanged", error: "音声機器の接続が変わったため終了しました。")
      }
    ]
    timer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] _ in
      guard let self, !self.finishing else { return }
      let now = Date()
      if let since = self.commandSince, let body = self.commandBody,
         now.timeIntervalSince(since) >= 1.2, now.timeIntervalSince(self.lastSound) >= 1.2 {
        self.draft?["content"] = body
        self.finish(reason: "command")
      } else if now.timeIntervalSince(self.started) >= 55 {
        self.finish(reason: "limit")
      } else if self.silenceEnabled && now.timeIntervalSince(self.lastSound) >= self.silenceSeconds {
        self.finish(reason: "silence")
      }
    }
  }

  private func finish(reason: String, error: String = "") {
    guard active && !finishing else { return }
    finishing = true; stopReason = reason; stopError = error
    timer?.invalidate(); timer = nil
    engine?.stop()
    if tapInstalled { engine?.inputNode.removeTap(onBus: 0); tapInstalled = false }
    request?.endAudio()
    do { try checkpoint() } catch { stopError = "下書きの保存に失敗しました。画面の文字を確認してください。" }
    // Allow a final recognition result; never wait indefinitely for Speech.
    let currentGeneration = generation
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
      if self?.generation == currentGeneration && self?.finishing == true { self?.complete() }
    }
  }

  private func complete() {
    guard active else { return }
    let content = draft?["content"] ?? ""
    let id = draft?["id"] ?? ""
    do { try checkpoint() } catch { stopError = "下書きの保存に失敗しました。" }
    let reason = stopReason, error = stopError
    cleanup()
    sendEvent("onEnd", ["id": id, "content": content, "reason": reason, "error": error])
  }

  private func cleanup() {
    active = false; finishing = false
    timer?.invalidate(); timer = nil
    engine?.stop()
    if tapInstalled { engine?.inputNode.removeTap(onBus: 0); tapInstalled = false }
    request?.endAudio(); task?.cancel()
    engine = nil; request = nil; task = nil; recognizer = nil
    observers.forEach(NotificationCenter.default.removeObserver); observers = []
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }
  private func draftDirectory() throws -> URL {
    let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("speech-drafts", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication])
    return directory
  }
  private func checkpoint() throws {
    guard var data = draft, let id = data["id"] else { return }
    let formatter = ISO8601DateFormatter(); formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    data["updated_at"] = formatter.string(from: Date()); draft = data
    let url = try draftDirectory().appendingPathComponent(id + ".json")
    try JSONEncoder().encode(data).write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
  }
  private func failure(_ text: String) -> NSError { NSError(domain: "MONOTE", code: 1, userInfo: [NSLocalizedDescriptionKey: text]) }
}
