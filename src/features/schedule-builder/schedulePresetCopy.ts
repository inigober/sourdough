import type { SchedulePresetChange, SchedulePresetField, SchedulePresetInfo } from '../../lib/schedule/presets.ts';
import { proofingStyleOptions } from './scheduleOptions.ts';

const MAX_CHANGES_LISTED = 5;

type FieldCopy = { label: string; unit?: string };

const fieldCopy: Record<SchedulePresetField, FieldCopy> = {
  startTime: { label: 'Start time' },
  autolyseEnabled: { label: 'Autolyse' },
  autolyseMinutes: { label: 'Autolyse time', unit: 'min' },
  saltAfterLevain: { label: 'Mix salt after levain' },
  restAfterLevainMinutes: { label: 'Rest after levain', unit: 'min' },
  restAfterSaltMinutes: { label: 'Rest after salt', unit: 'min' },
  slapAndFolds: { label: 'Slap and folds' },
  restAfterSlapAndFoldMinutes: { label: 'Rest after slap and folds', unit: 'min' },
  stretchAndFoldSets: { label: 'Stretch and fold sets' },
  stretchAndFoldRestMinutes: { label: 'Rest between stretch and folds', unit: 'min' },
  coilFoldSets: { label: 'Coil fold sets' },
  coilFoldRestMinutes: { label: 'Rest between coil folds', unit: 'min' },
  preShapeMinutesBeforeBulkEnd: { label: 'Pre-shape before bulk ends', unit: 'min' },
  proofingStyle: { label: 'Proofing style' },
  desiredBakeTime: { label: 'Desired bake time' },
  roomProofHours: { label: 'Room-temperature proof', unit: 'h' },
};

function formatChangeValue(field: SchedulePresetField, value: SchedulePresetChange['from']): string {
  if (typeof value === 'boolean') {
    return value ? 'on' : 'off';
  }

  if (field === 'proofingStyle') {
    return proofingStyleOptions.find((option) => option.value === value)?.label ?? String(value);
  }

  const unit = fieldCopy[field].unit;
  return unit ? `${value} ${unit}` : String(value);
}

/** Plain-language list of what a preset would overwrite, for the confirmation dialog. */
export function describePresetChanges(
  preset: SchedulePresetInfo,
  changes: readonly SchedulePresetChange[],
): string {
  const listed = changes
    .slice(0, MAX_CHANGES_LISTED)
    .map(
      (change) =>
        `${fieldCopy[change.field].label}: ${formatChangeValue(change.field, change.from)} to ${formatChangeValue(change.field, change.to)}`,
    );
  const remaining = changes.length - listed.length;
  const more = remaining > 0 ? `; and ${remaining} more` : '';

  return `You have changed some settings. Switching to "${preset.label}" will reset these (${listed.join('; ')}${more}). Your oven, starter and recipe settings stay as they are.`;
}
