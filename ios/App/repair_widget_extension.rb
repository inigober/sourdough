#!/usr/bin/env ruby
# frozen_string_literal: true

require 'xcodeproj'

project_path = File.expand_path('App.xcodeproj', __dir__)
project = Xcodeproj::Project.open(project_path)

extension_target = project.targets.find { |t| t.name == 'BakeTimerWidgetExtension' }
unless extension_target
  warn 'BakeTimerWidgetExtension target not found. Run configure_widget_extension.rb first.'
  exit 1
end

product = extension_target.product_reference
product.name = 'BakeTimerWidgetExtension.appex'
product.path = 'BakeTimerWidgetExtension.appex'
product.explicit_file_type = 'wrapper.app-extension'

extension_target.product_name = 'BakeTimerWidgetExtension'

extension_target.build_configurations.each do |config|
  config.build_settings['PRODUCT_NAME'] = 'BakeTimerWidgetExtension'
  config.build_settings['SKIP_INSTALL'] = 'YES'
end

app_target = project.targets.find { |t| t.name == 'App' }
if app_target && !app_target.dependencies.any? { |dep| dep.target == extension_target }
  app_target.add_dependency(extension_target)
end

project.save
puts 'Repaired BakeTimerWidgetExtension product name and build settings.'
