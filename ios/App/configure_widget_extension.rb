#!/usr/bin/env ruby
# frozen_string_literal: true

require 'fileutils'
require 'xcodeproj'

project_path = File.expand_path('App.xcodeproj', __dir__)
project = Xcodeproj::Project.open(project_path)

app_target = project.targets.find { |t| t.name == 'App' }
raise 'App target not found' unless app_target

widget_group = project.main_group.find_subpath('BakeTimerWidget', true)
widget_group.set_source_tree('<group>')
widget_group.set_path('BakeTimerWidget')

shared_group = project.main_group.find_subpath('BakeTimerShared', true)
shared_group.set_source_tree('<group>')
shared_group.set_path('BakeTimerShared')

shared_files = [
  'BakeTimerAlarmMetadata.swift',
  'BakeTimerAlarmIntents.swift',
  'BakeTimerAlarmButtons.swift',
  'AppIcons.swift',
].map do |name|
  shared_group.files.find { |f| f.path == name } || shared_group.new_file(name)
end

widget_files = [
  'BakeTimerWidgetBundle.swift',
  'BakeTimerLiveActivity.swift',
  'BakeTimerCountdownViews.swift',
].map do |name|
  widget_group.files.find { |f| f.path == name } || widget_group.new_file(name)
end

widget_group.files.find { |f| f.path == 'Info.plist' } || widget_group.new_file('Info.plist')

extension_target = project.targets.find { |t| t.name == 'BakeTimerWidgetExtension' }
unless extension_target
  extension_target = project.new_target(
    :app_extension,
    'BakeTimerWidgetExtension',
    :ios,
    '26.0',
  )
end

extension_target.build_configurations.each do |config|
  config.build_settings['INFOPLIST_FILE'] = 'BakeTimerWidget/Info.plist'
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.inigo.sourdough.BakeTimerWidget'
  config.build_settings['PRODUCT_NAME'] = 'BakeTimerWidgetExtension'
  config.build_settings['SKIP_INSTALL'] = 'YES'
  config.build_settings['SWIFT_VERSION'] = '5.0'
  config.build_settings['TARGETED_DEVICE_FAMILY'] = '1,2'
  config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '26.0'
  config.build_settings['CODE_SIGN_STYLE'] = 'Automatic'
  config.build_settings['CURRENT_PROJECT_VERSION'] = '1'
  config.build_settings['MARKETING_VERSION'] = '1.0'
  config.build_settings['GENERATE_INFOPLIST_FILE'] = 'NO'
  config.build_settings['APPLICATION_EXTENSION_API_ONLY'] = 'YES'
end

extension_target.product_reference.name = 'BakeTimerWidgetExtension.appex'
extension_target.product_reference.path = 'BakeTimerWidgetExtension.appex'
extension_target.product_name = 'BakeTimerWidgetExtension'

extension_target.source_build_phase.clear
extension_target.add_file_references(widget_files + shared_files)

shared_files.each do |shared_file|
  next if app_target.source_build_phase.files_references.include?(shared_file)

  app_target.add_file_references([shared_file])
end

unless app_target.dependencies.any? { |dep| dep.target == extension_target }
  app_target.add_dependency(extension_target)
end

embed_phase = app_target.copy_files_build_phases.find { |phase| phase.name == 'Embed Foundation Extensions' }
unless embed_phase
  embed_phase = app_target.new_copy_files_build_phase('Embed Foundation Extensions')
  embed_phase.symbol_dst_subfolder_spec = :plug_ins
end

product_ref = extension_target.product_reference
unless embed_phase.files_references.include?(product_ref)
  build_file = embed_phase.add_file_reference(product_ref)
  build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
end

scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app_target)
scheme.add_build_target(extension_target)
scheme.set_launch_target(app_target)
scheme.save_as(project_path, 'App', true)

workspace_settings_dir = File.expand_path('App.xcworkspace/xcshareddata', __dir__)
FileUtils.mkdir_p(workspace_settings_dir)
File.write(
  File.join(workspace_settings_dir, 'WorkspaceSettings.xcsettings'),
  <<~XML,
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
    \t<key>IDEWorkspaceSharedSettings_AutocreateSchemesIfNeeded</key>
    \t<false/>
    </dict>
    </plist>
  XML
)

project.save
puts 'BakeTimerWidgetExtension target configured.'
puts 'Shared App scheme created; auto-generated widget extension scheme disabled.'
