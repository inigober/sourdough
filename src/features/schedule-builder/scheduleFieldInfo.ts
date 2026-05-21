export const scheduleFieldInfo = {
  startTime:
    'When the first mixing step begins on mix day — autolyse if enabled, otherwise levain mix. All later steps are calculated forward from this time.',
  mixDate: 'The calendar day you mix the dough. Bake day is calculated from this date and your proofing choice.',
  saltAfterLevain: 'Default order: levain first, then salt. Turn off only if you use a different incorporation order.',
  restAfterLevainMinutes:
    'Rest during bulk fermentation, right after levain is mixed in. Bulk starts as soon as levain is incorporated.',
  restAfterSaltMinutes:
    'Rest helps the dough relax after salt is mixed in — salt tends to tighten the gluten.',
  slapAndFolds:
    'Slaps the dough in the air to build early strength. Best for wet doughs around 83%+ hydration — skip for stiffer doughs.',
  restAfterSlapAndFoldMinutes: 'Short rest after slap and folds before bulk continues.',
  stretchAndFoldSets:
    'Gentle letter-folds that build structure without much degassing. The default approach for most doughs and hydration levels.',
  stretchAndFoldRestMinutes: 'Rest time between stretch-and-fold sets.',
  coilFoldSets:
    'Lift-and-coil folds for slack, high-hydration dough. Use when stretch-and-folds are not enough to control spread.',
  coilFoldRestMinutes: 'Rest time between coil-fold sets.',
  preShapeMinutesBeforeBulkEnd: 'When pre-shaping happens relative to the end of bulk.',
  desiredBakeTime:
    'When you want to bake on the next day. Cold retard hours are calculated from when shaping finishes to this time.',
  roomProofHours: 'Default scales with room temperature — warmer rooms need less time.',
  bakeMethod: 'Dutch oven or open-oven bake profile.',
  dutchOvenClosedMinutes: 'Bake with the lid on for oven spring.',
  dutchOvenLidOffMinutes: 'Bake with the lid off to set the crust.',
  dutchOvenOutOfPotMinutes: 'Finish bake outside the pot for an even crust.',
  openBakeMinutes: 'Initial bake at the higher start temperature.',
  finishMinutes: 'Lower-temperature finish bake.',
  openBakeTempCelsius: 'Higher starting temperature for oven spring.',
  finishTempCelsius: 'Lower finish temperature so the crust does not burn before the crumb sets.',
} as const;
