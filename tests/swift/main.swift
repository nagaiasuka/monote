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
func checkRoute(_ name: String, _ reason: UInt, _ previous: [String], _ current: [String], _ expected: Bool) {
  precondition(RecordingRoutePolicy.shouldStop(reason: reason, recordingInputs: previous, currentInputs: current) == expected, name)
}
checkRoute("startup category change must not stop recording", 3, [], ["built-in"], false)
checkRoute("speaker override without microphone change", 4, ["built-in"], ["built-in"], false)
checkRoute("output-only Bluetooth connection", 1, ["built-in"], ["built-in"], false)
checkRoute("Bluetooth microphone disconnected", 2, ["bluetooth"], ["built-in"], true)
checkRoute("no input route remains", 7, ["built-in"], [], true)
checkRoute("unchanged configuration", 8, ["built-in"], ["built-in"], false)
checkRoute("input configuration changed", 8, ["built-in"], ["usb"], true)
print("RecordingRoutePolicy: 7 checks passed")
func checkSilence(_ name: String, _ enabled: Bool, _ hasText: Bool, _ elapsed: Double, _ quiet: Double, _ expected: Bool) {
  precondition(RecordingSilencePolicy.shouldStop(enabled: enabled, hasTranscript: hasText, elapsedSinceStart: elapsed, elapsedSinceSound: quiet, silenceSeconds: 5) == expected, name)
}
checkSilence("wait for the first utterance beyond the initial five seconds", true, false, 5, 5, false)
checkSilence("startup grace still active", true, false, 14.9, 14.9, false)
checkSilence("empty input can stop after the grace period", true, false, 15, 15, true)
checkSilence("quiet speech with recent transcript is not silence", true, true, 20, 0.5, false)
checkSilence("pause after speech uses configured duration", true, true, 20, 5, true)
checkSilence("automatic silence stop disabled", false, false, 30, 30, false)
print("RecordingSilencePolicy: 6 checks passed")
