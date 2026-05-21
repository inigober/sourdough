export type ProofingStyle = 'roomTemperature' | 'cold' | 'both';

export type BakeMethod = 'dutchOven' | 'open';

export type ScheduleInput = {
  startTime: string;
  autolyseEnabled: boolean;
  autolyseMinutes: number;
  restAfterAutolyseMinutes: number;
  mixMinutes: number;
  saltAfterLevain: boolean;
  saltMixMinutes: number;
  restAfterMixMinutes: number;
  slapAndFoldSlaps: number;
  stretchAndFoldSets: number;
  stretchAndFoldRestMinutes: number;
  coilFoldSets: number;
  coilFoldRestMinutes: number;
  preShapeMinutesBeforeBulkEnd: number;
  shapeMinutes: number;
  proofingStyle: ProofingStyle;
  coldRetardHours: number;
  roomProofHours: number;
  roomFinishAfterColdHours: number;
  bakeMethod: BakeMethod;
  dutchOvenClosedMinutes: number;
  dutchOvenLidOffMinutes: number;
  dutchOvenOutOfPotMinutes: number;
  openBakeMinutes: number;
  finishMinutes: number;
  openBakeTempCelsius: number;
  finishTempCelsius: number;
};

export type TimelineStep = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  detail?: string;
};

export type FoldDefaults = {
  stretchAndFoldSets: number;
  coilFoldSets: number;
  slapAndFoldSlaps: number;
  foldRestMinutes: number;
};
