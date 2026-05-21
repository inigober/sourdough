export type ProofingStyle = 'roomTemperature' | 'cold';

export type BakeMethod = 'dutchOven' | 'open';

export type ScheduleInput = {
  mixDate: string;
  startTime: string;
  autolyseEnabled: boolean;
  autolyseMinutes: number;
  saltAfterLevain: boolean;
  restAfterLevainMinutes: number;
  restAfterSaltMinutes: number;
  slapAndFolds: number;
  restAfterSlapAndFoldMinutes: number;
  stretchAndFoldSets: number;
  stretchAndFoldRestMinutes: number;
  coilFoldSets: number;
  coilFoldRestMinutes: number;
  preShapeMinutesBeforeBulkEnd: number;
  proofingStyle: ProofingStyle;
  desiredBakeTime: string;
  roomProofHours: number;
  bakeMethod: BakeMethod;
  dutchOvenClosedMinutes: number;
  dutchOvenLidOffMinutes: number;
  dutchOvenOutOfPotMinutes: number;
  openBakeMinutes: number;
  finishMinutes: number;
  openBakeTempCelsius: number;
  finishTempCelsius: number;
  includeStarterPrep: boolean;
  starterFromFridge: boolean;
  levainBuildHours: number;
  levainBufferPercent: number;
};

export type TimelineStep = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  startOffsetMinutes: number;
  dateLabel?: string;
  detail?: string;
};

export type FoldDefaults = {
  stretchAndFoldSets: number;
  coilFoldSets: number;
  slapAndFolds: number;
  foldRestMinutes: number;
};
