import AppKit

// Draw a simple, reproducible vector mark; no downloaded artwork.
let size = 1024
let image = NSImage(size: NSSize(width: size, height: size))
image.lockFocus()
NSColor(red: 0.97, green: 0.94, blue: 0.89, alpha: 1).setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: size, height: size)).fill()
NSColor(red: 0.50, green: 0.35, blue: 0.21, alpha: 1).setStroke()
let book = NSBezierPath()
book.lineWidth = 24; book.lineCapStyle = .round; book.lineJoinStyle = .round
book.move(to: NSPoint(x: 220, y: 310))
book.line(to: NSPoint(x: 220, y: 700))
book.curve(to: NSPoint(x: 512, y: 652), controlPoint1: NSPoint(x: 320, y: 730), controlPoint2: NSPoint(x: 430, y: 690))
book.curve(to: NSPoint(x: 804, y: 700), controlPoint1: NSPoint(x: 594, y: 690), controlPoint2: NSPoint(x: 704, y: 730))
book.line(to: NSPoint(x: 804, y: 310))
book.curve(to: NSPoint(x: 512, y: 270), controlPoint1: NSPoint(x: 700, y: 340), controlPoint2: NSPoint(x: 600, y: 310))
book.curve(to: NSPoint(x: 220, y: 310), controlPoint1: NSPoint(x: 424, y: 310), controlPoint2: NSPoint(x: 324, y: 340))
book.stroke()
let spine = NSBezierPath(); spine.lineWidth = 18; spine.lineCapStyle = .round
spine.move(to: NSPoint(x: 512, y: 270)); spine.line(to: NSPoint(x: 512, y: 652)); spine.stroke()
for (offset, length) in [44, 84, 130, 84, 44].enumerated() {
  let wave = NSBezierPath(); wave.lineWidth = 20; wave.lineCapStyle = .round
  let x = 308 + offset * 34
  wave.move(to: NSPoint(x: x, y: 475 - length / 2))
  wave.line(to: NSPoint(x: x, y: 475 + length / 2)); wave.stroke()
}
let line = NSBezierPath(); line.lineWidth = 16; line.lineCapStyle = .round
for y in [480, 545] { line.move(to: NSPoint(x: 592, y: y)); line.line(to: NSPoint(x: 710, y: y)) }
line.stroke()
image.unlockFocus()
let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "assets/monote-icon.png"))
