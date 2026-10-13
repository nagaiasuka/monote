const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const app = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(path.join(app, 'Info.plist'))) {
  console.error('Usage: node scripts/verify-ios-app.cjs /path/to/MONOTE.app');
  process.exit(2);
}
const executable = execFileSync(
  '/usr/libexec/PlistBuddy',
  ['-c', 'Print :CFBundleExecutable', path.join(app, 'Info.plist')],
  { encoding: 'utf8' },
).trim();
for (const key of ['NSMicrophoneUsageDescription', 'NSSpeechRecognitionUsageDescription']) {
  let description = '';
  try {
    description = execFileSync(
      '/usr/libexec/PlistBuddy',
      ['-c', `Print :${key}`, path.join(app, 'Info.plist')],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ).trim();
  } catch {}
  if (!description) {
    console.error(`Missing iOS permission description: ${key}`);
    process.exit(1);
  }
}
const frameworkDir = path.join(app, 'Frameworks');
const binaries = [path.join(app, executable)];
for (const name of fs.readdirSync(app)) {
  if (name.endsWith('.dylib')) binaries.push(path.join(app, name));
}
if (fs.existsSync(frameworkDir)) {
  for (const name of fs.readdirSync(frameworkDir)) {
    if (!name.endsWith('.framework')) continue;
    const binary = path.join(frameworkDir, name, name.slice(0, -'.framework'.length));
    if (fs.existsSync(binary)) binaries.push(binary);
  }
}
const missing = new Set();
for (const binary of binaries) {
  const dependencies = execFileSync('otool', ['-L', binary], { encoding: 'utf8' });
  for (const match of dependencies.matchAll(/^\s+@rpath\/(\S+) \(/gm)) {
    const relative = match[1];
    // Check bundled frameworks and the app's debug dylib. System Swift runtime
    // libraries may be resolved from iOS itself and aren't app frameworks.
    if (!relative.includes('.framework/') && !relative.endsWith('.debug.dylib')) continue;
    if (
      !fs.existsSync(path.join(frameworkDir, relative)) &&
      !fs.existsSync(path.join(app, relative))
    ) {
      missing.add(`${path.basename(binary)} -> @rpath/${relative}`);
    }
  }
}
if (missing.size) {
  console.error('Missing iOS runtime dependencies:\n' + [...missing].join('\n'));
  process.exit(1);
}
console.log(`iOS app dependency check passed (${binaries.length} binaries).`);
