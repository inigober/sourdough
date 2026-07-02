#!/usr/bin/env ruby
# frozen_string_literal: true

require 'xcodeproj'

project_path = File.expand_path('App.xcodeproj', __dir__)
project = Xcodeproj::Project.open(project_path)

app_target = project.targets.find { |t| t.name == 'App' }
embed_phase = app_target&.shell_script_build_phases&.find { |phase| phase.name == '[CP] Embed Pods Frameworks' }
if embed_phase
  embed_phase.always_out_of_date = '1'
  puts 'Marked [CP] Embed Pods Frameworks as alwaysOutOfDate.'
end

project.save
