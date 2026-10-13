const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ios = path.resolve(process.argv[2] || 'ios');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8'));
const plist = path.join(ios, 'MONOTE/Info.plist');
for (const key of ['NSMicrophoneUsageDescription', 'NSSpeechRecognitionUsageDescription']) {
  const value = config.expo.ios.infoPlist[key];
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing ${key} in app.json`);
  const args = ['-c', `Set :${key} ${value}`, plist];
  try {
    execFileSync('/usr/libexec/PlistBuddy', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    execFileSync('/usr/libexec/PlistBuddy', ['-c', `Add :${key} string ${value}`, plist]);
  }
}
console.log('iOS microphone / speech permission descriptions synced.');
