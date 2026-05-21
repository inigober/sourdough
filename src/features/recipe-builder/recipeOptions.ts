import { flourProfiles } from '../../lib/recipe/flourProfiles.ts';
import type { FlourType, LevainActivity, LevainType } from '../../lib/recipe/types.ts';

export const flourOptions: readonly { label: string; value: FlourType }[] = Object.values(flourProfiles).map(
  (flour) => ({
    label: flour.label,
    value: flour.id,
  }),
);

export const levainTypeOptions: readonly { label: string; value: LevainType }[] = [
  { label: 'Stiff levain (60%)', value: 'stiffLevain' },
  { label: '100% hydration levain', value: 'standard100' },
  { label: 'Liquid levain (140%)', value: 'liquidLevain' },
  { label: 'Custom hydration', value: 'customHydration' },
];

export const levainActivityOptions: readonly { label: string; value: LevainActivity }[] = [
  { label: 'Very active', value: 'veryActive' },
  { label: 'Active', value: 'active' },
  { label: 'Recently refreshed, not peaked', value: 'recentlyRefreshedButNotPeaked' },
  { label: 'Sleepy', value: 'sleepy' },
  { label: 'Inactive', value: 'inactive' },
];
