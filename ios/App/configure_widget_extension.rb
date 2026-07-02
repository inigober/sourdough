#!/usr/bin/env ruby
# frozen_string_literal: true

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

shared_file = shared_group.new_file('BakeTimerAlarmMetadata.swift')
widget_files = [
  'BakeTimerWidgetBundle.swift',
  'BakeTimerLiveActivity.swift',
  'BakeTimerCountdownViews.swift',
].map { |name| widget_group.new_file(name) }

info_plist = widget_group.new_file('Info.plist')

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
  config.build_settings['SWIFT_VERSION'] = '5.0'
  config.build_settings['TARGETED_DEVICE_FAMILY'] = '1,2'
  config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '26.0'
  config.build_settings['CODE_SIGN_STYLE'] = 'Automatic'
  config.build_settings['CURRENT_PROJECT_VERSION'] = '1'
  config.build_settings['MARKETING_VERSION'] = '1.0'
  config.build_settings['GENERATE_INFOPLIST_FILE'] = 'NO'
  config.build_settings['APPLICATION_EXTENSION_API_ONLY'] = 'YES'
end

extension_target.source_build_phase.clear
extension_target.add_file_references(widget_files + [shared_file])

app_target.add_file_references([shared_file]) unless app_target.source_build_phase.files_references.include?(shared_file)

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

project.save
puts 'BakeTimerWidgetExtension target configured.'
