import Foundation

struct SpeechWord {
  let text: String
  let start: TimeInterval
  let duration: TimeInterval
}

enum StopCommand {
  // A command must be its own utterance, with a pause before it. A suffix match alone
  // would incorrectly stop on e.g. 「ここでメモ終了と言っていた」.
  static func bodyIfCommand(_ words: [SpeechWord]) -> String? {
    guard !words.isEmpty else { return nil }
    var start = words.count - 1
    while start > 0 {
      let previous = words[start - 1]
      if words[start].start - (previous.start + previous.duration) >= 0.8 { break }
      start -= 1
    }
    let phrase = words[start...].map(\.text).joined()
      .filter { !" 、。！？!?\n\t".contains($0) }
    guard phrase == "メモ終了" else { return nil }
    return words[..<start].map(\.text).joined().trimmingCharacters(in: .whitespacesAndNewlines)
  }
}
