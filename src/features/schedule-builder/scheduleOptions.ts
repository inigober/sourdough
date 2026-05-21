import type { BakeMethod, ProofingStyle } from '../../lib/schedule/types.ts';

export const proofingStyleOptions: readonly { label: string; value: ProofingStyle }[] = [
  { label: 'Room temperature', value: 'roomTemperature' },
  { label: 'Cold retard', value: 'cold' },
  { label: 'Both', value: 'both' },
];

export const bakeMethodOptions: readonly { label: string; value: BakeMethod }[] = [
  { label: 'Dutch oven', value: 'dutchOven' },
  { label: 'Open bake', value: 'open' },
];
