Pod::Spec.new do |s|
  s.name = 'MonoteSpeech'
  s.version = '0.1.0'
  s.summary = 'Local Japanese speech capture for MONOTE'
  s.description = 'On-device speech recognition with recoverable text drafts.'
  s.license = { :type => 'MIT' }
  s.author = 'MONOTE'
  s.homepage = 'https://github.com/nagaiasuka/monote'
  s.platforms = { :ios => '16.4' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.frameworks = 'Speech', 'AVFoundation', 'UIKit'
  s.swift_version = '5.9'
end
