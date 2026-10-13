const fs = require('node:fs');
const path = require('node:path');
const { withXcodeProject, withAppDelegate, IOSConfig } = require('expo/config-plugins');

function addSource(project, projectRoot, projectName) {
  const folder = path.join(projectRoot, 'ios', projectName);
  fs.copyFileSync(
    path.join(__dirname, '../native/MonoteIntents.swift'),
    path.join(folder, 'MonoteIntents.swift'),
  );
  IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
    filepath: `${projectName}/MonoteIntents.swift`,
    groupName: projectName,
    project,
    targetUuid: project.getFirstTarget().uuid,
  });
}
function updateDelegate(source) {
  if (!source.includes('import AppIntents')) source = 'import AppIntents\n' + source;
  if (!source.includes('MonoteAppShortcuts.updateAppShortcutParameters()')) {
    const marker = '    let delegate = ReactNativeDelegate()';
    if (!source.includes(marker)) throw new Error('MONOTE AppDelegate startup marker not found');
    source = source.replace(
      marker,
      '    MonoteAppShortcuts.updateAppShortcutParameters()\n' + marker,
    );
  }
  return source;
}
module.exports = function withMonoteIntents(config) {
  config = withXcodeProject(config, (mod) => {
    addSource(mod.modResults, mod.modRequest.projectRoot, mod.modRequest.projectName);
    return mod;
  });
  return withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift') throw new Error('MONOTE requires a Swift AppDelegate');
    mod.modResults.contents = updateDelegate(mod.modResults.contents);
    return mod;
  });
};
module.exports.applyToExistingProject = (root) => {
  const xcode = require('xcode');
  const filename = path.join(root, 'ios/MONOTE.xcodeproj/project.pbxproj');
  const project = xcode.project(filename);
  project.parseSync();
  addSource(project, root, 'MONOTE');
  fs.writeFileSync(filename, project.writeSync());
  const delegate = path.join(root, 'ios/MONOTE/AppDelegate.swift');
  fs.writeFileSync(delegate, updateDelegate(fs.readFileSync(delegate, 'utf8')));
};
if (require.main === module) module.exports.applyToExistingProject(process.argv[2]);
