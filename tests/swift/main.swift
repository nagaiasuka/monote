import Foundation
var count = 0
func check(_ words: [SpeechWord], _ expected: String?) {
  precondition(StopCommand.bodyIfCommand(words) == expected)
  count += 1
}
check([], nil)
check([SpeechWord(text: "メモ終了", start: 0, duration: 1)], "")
check([SpeechWord(text: "大事なこと。", start: 0, duration: 2), SpeechWord(text: "メモ", start: 3, duration: 0.4), SpeechWord(text: "終了", start: 3.4, duration: 0.5)], "大事なこと。")
check([SpeechWord(text: "ここで", start: 0, duration: 0.4), SpeechWord(text: "メモ終了", start: 0.5, duration: 1)], nil)
check([SpeechWord(text: "メモ終了", start: 0, duration: 1), SpeechWord(text: "と言っていた", start: 1.1, duration: 1)], nil)
check([SpeechWord(text: "メモ終了の方法", start: 0, duration: 2)], nil)
check([SpeechWord(text: "メモ 終了。", start: 0, duration: 2)], "")
print("StopCommand: \(count) checks passed")
