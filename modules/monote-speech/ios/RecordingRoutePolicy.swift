import Foundation

enum RecordingRoutePolicy {
  // AVAudioSession reasons: 1=new device, 2=old device unavailable,
  // 3=category change, 4=override, 7=no suitable route, 8=configuration change.
  // Category notifications from our own setCategory/setActive can arrive after
  // the recording observer is installed; they do not mean the mic was unplugged.
  static func shouldStop(reason: UInt, recordingInputs: [String], currentInputs: [String]) -> Bool {
    guard [UInt(1), 2, 4, 7, 8].contains(reason) else { return false }
    if currentInputs.isEmpty { return true }
    return !recordingInputs.isEmpty && Set(recordingInputs) != Set(currentInputs)
  }
}
