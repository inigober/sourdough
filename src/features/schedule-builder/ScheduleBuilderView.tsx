import { useMemo } from 'react';

import { NumberField } from '../../components/NumberField.tsx';
import { SectionHeading } from '../../components/SectionHeading.tsx';
import { SelectField } from '../../components/SelectField.tsx';
import { ToggleField } from '../../components/ToggleField.tsx';
import { buildTimeline } from '../../lib/schedule/buildTimeline.ts';
import type { RecipeInput } from '../../lib/recipe/types.ts';
import type { ScheduleInput } from '../../lib/schedule/types.ts';
import { BakePlanTimeline } from './BakePlanTimeline.tsx';
import { scheduleFieldInfo } from './scheduleFieldInfo.ts';
import { bakeMethodOptions, proofingStyleOptions } from './scheduleOptions.ts';

type ScheduleBuilderViewProps = {
  recipeInput: RecipeInput;
  scheduleInput: ScheduleInput;
  onScheduleChange: (patch: Partial<ScheduleInput>) => void;
  onBack: () => void;
};

export function ScheduleBuilderView({
  recipeInput,
  scheduleInput,
  onScheduleChange,
  onBack,
}: ScheduleBuilderViewProps) {
  const timeline = useMemo(
    () => buildTimeline(scheduleInput, recipeInput),
    [scheduleInput, recipeInput],
  );

  return (
    <div className="schedule-builder">
      <section className="hero schedule-builder__hero">
        <h1>Schedule builder</h1>
        <p className="hero-copy">
          Set when mixing starts and how you plan to handle the dough. The bake plan below updates
          forward from that start time.
        </p>
      </section>

      <section className="card">
        <SectionHeading
          title="Start time"
          copy="Choose when the first step begins — autolyse or levain mix if autolyse is off."
        />
        <form className="field-grid field-grid--pair">
          <label className="field-card">
            <span className="field-label-row">Start time</span>
            <input
              type="time"
              value={scheduleInput.startTime}
              onChange={(event) => onScheduleChange({ startTime: event.currentTarget.value })}
            />
          </label>
        </form>
      </section>

      <section className="card">
        <SectionHeading title="Mixing" copy="Salt is added after levain by default." />
        <form className="field-grid field-grid--responsive">
          <ToggleField
            label="Autolyse"
            checked={scheduleInput.autolyseEnabled}
            info={scheduleFieldInfo.autolyseEnabled}
            onChange={(autolyseEnabled) => onScheduleChange({ autolyseEnabled })}
          />
          {scheduleInput.autolyseEnabled ? (
            <>
              <NumberField
                label="Autolyse time"
                suffix="min"
                value={scheduleInput.autolyseMinutes}
                min={0}
                step={5}
                info={scheduleFieldInfo.autolyseMinutes}
                onChange={(autolyseMinutes) => onScheduleChange({ autolyseMinutes })}
              />
              <NumberField
                label="Rest after autolyse"
                suffix="min"
                value={scheduleInput.restAfterAutolyseMinutes}
                min={0}
                step={5}
                info={scheduleFieldInfo.restAfterAutolyseMinutes}
                onChange={(restAfterAutolyseMinutes) => onScheduleChange({ restAfterAutolyseMinutes })}
              />
            </>
          ) : null}
          <NumberField
            label="Mix in levain"
            suffix="min"
            value={scheduleInput.mixMinutes}
            min={1}
            step={1}
            info={scheduleFieldInfo.mixMinutes}
            onChange={(mixMinutes) => onScheduleChange({ mixMinutes })}
          />
          <NumberField
            label="Slap and fold slaps"
            value={scheduleInput.slapAndFoldSlaps}
            min={0}
            max={200}
            step={5}
            info={scheduleFieldInfo.slapAndFoldSlaps}
            onChange={(slapAndFoldSlaps) => onScheduleChange({ slapAndFoldSlaps })}
          />
          <ToggleField
            label="Salt after levain"
            checked={scheduleInput.saltAfterLevain}
            info={scheduleFieldInfo.saltAfterLevain}
            onChange={(saltAfterLevain) => onScheduleChange({ saltAfterLevain })}
          />
          <NumberField
            label="Mix in salt"
            suffix="min"
            value={scheduleInput.saltMixMinutes}
            min={1}
            step={1}
            info={scheduleFieldInfo.saltMixMinutes}
            onChange={(saltMixMinutes) => onScheduleChange({ saltMixMinutes })}
          />
          <NumberField
            label="Rest after mixing"
            suffix="min"
            value={scheduleInput.restAfterMixMinutes}
            min={0}
            step={5}
            info={scheduleFieldInfo.restAfterMixMinutes}
            onChange={(restAfterMixMinutes) => onScheduleChange({ restAfterMixMinutes })}
          />
        </form>
      </section>

      <section className="card">
        <SectionHeading
          title="Bulk, folds, and shaping"
          copy={`Bulk window follows your ${recipeInput.targetBulkHours}h fermentation target from the recipe.`}
        />
        <form className="field-grid field-grid--responsive">
          <NumberField
            label="Stretch and fold sets"
            value={scheduleInput.stretchAndFoldSets}
            min={0}
            max={8}
            step={1}
            info={scheduleFieldInfo.stretchAndFoldSets}
            onChange={(stretchAndFoldSets) => onScheduleChange({ stretchAndFoldSets })}
          />
          <NumberField
            label="Rest between stretch and folds"
            suffix="min"
            value={scheduleInput.stretchAndFoldRestMinutes}
            min={10}
            step={5}
            info={scheduleFieldInfo.stretchAndFoldRestMinutes}
            onChange={(stretchAndFoldRestMinutes) => onScheduleChange({ stretchAndFoldRestMinutes })}
          />
          <NumberField
            label="Coil fold sets"
            value={scheduleInput.coilFoldSets}
            min={0}
            max={8}
            step={1}
            info={scheduleFieldInfo.coilFoldSets}
            onChange={(coilFoldSets) => onScheduleChange({ coilFoldSets })}
          />
          <NumberField
            label="Rest between coil folds"
            suffix="min"
            value={scheduleInput.coilFoldRestMinutes}
            min={10}
            step={5}
            info={scheduleFieldInfo.coilFoldRestMinutes}
            onChange={(coilFoldRestMinutes) => onScheduleChange({ coilFoldRestMinutes })}
          />
          <NumberField
            label="Pre-shape before bulk ends"
            suffix="min"
            value={scheduleInput.preShapeMinutesBeforeBulkEnd}
            min={10}
            step={5}
            info={scheduleFieldInfo.preShapeMinutesBeforeBulkEnd}
            onChange={(preShapeMinutesBeforeBulkEnd) => onScheduleChange({ preShapeMinutesBeforeBulkEnd })}
          />
          <NumberField
            label="Shape"
            suffix="min"
            value={scheduleInput.shapeMinutes}
            min={5}
            step={5}
            info={scheduleFieldInfo.shapeMinutes}
            onChange={(shapeMinutes) => onScheduleChange({ shapeMinutes })}
          />
        </form>
      </section>

      <section className="card">
        <SectionHeading title="Proofing" copy="Proofing style does not change ingredient weights." />
        <form className="field-grid field-grid--responsive">
          <SelectField
            label="Proofing style"
            value={scheduleInput.proofingStyle}
            options={proofingStyleOptions}
            info={scheduleFieldInfo.proofingStyle}
            onChange={(proofingStyle) => onScheduleChange({ proofingStyle })}
          />
          {scheduleInput.proofingStyle === 'cold' || scheduleInput.proofingStyle === 'both' ? (
            <NumberField
              label="Cold retard"
              suffix="h"
              value={scheduleInput.coldRetardHours}
              min={8}
              max={24}
              step={0.5}
              info={scheduleFieldInfo.coldRetardHours}
              onChange={(coldRetardHours) => onScheduleChange({ coldRetardHours })}
            />
          ) : null}
          {scheduleInput.proofingStyle === 'roomTemperature' ? (
            <NumberField
              label="Room-temperature proof"
              suffix="h"
              value={scheduleInput.roomProofHours}
              min={0.5}
              max={6}
              step={0.25}
              info={scheduleFieldInfo.roomProofHours}
              onChange={(roomProofHours) => onScheduleChange({ roomProofHours })}
            />
          ) : null}
          {scheduleInput.proofingStyle === 'both' ? (
            <NumberField
              label="Room finish after cold"
              suffix="h"
              value={scheduleInput.roomFinishAfterColdHours}
              min={0.5}
              max={4}
              step={0.25}
              info={scheduleFieldInfo.roomFinishAfterColdHours}
              onChange={(roomFinishAfterColdHours) => onScheduleChange({ roomFinishAfterColdHours })}
            />
          ) : null}
        </form>
      </section>

      <section className="card">
        <SectionHeading title="Bake" copy="Temperature defaults follow your dough size." />
        <form className="field-grid field-grid--responsive">
          <SelectField
            label="Bake method"
            value={scheduleInput.bakeMethod}
            options={bakeMethodOptions}
            info={scheduleFieldInfo.bakeMethod}
            onChange={(bakeMethod) => onScheduleChange({ bakeMethod })}
          />
          <NumberField
            label="Open bake temperature"
            suffix="°C"
            value={scheduleInput.openBakeTempCelsius}
            min={200}
            max={280}
            step={5}
            info={scheduleFieldInfo.openBakeTempCelsius}
            onChange={(openBakeTempCelsius) => onScheduleChange({ openBakeTempCelsius })}
          />
          <NumberField
            label="Finish temperature"
            suffix="°C"
            value={scheduleInput.finishTempCelsius}
            min={160}
            max={250}
            step={5}
            info={scheduleFieldInfo.finishTempCelsius}
            onChange={(finishTempCelsius) => onScheduleChange({ finishTempCelsius })}
          />
          {scheduleInput.bakeMethod === 'dutchOven' ? (
            <>
              <NumberField
                label="Dutch oven, lid on"
                suffix="min"
                value={scheduleInput.dutchOvenClosedMinutes}
                min={10}
                step={5}
                info={scheduleFieldInfo.dutchOvenClosedMinutes}
                onChange={(dutchOvenClosedMinutes) => onScheduleChange({ dutchOvenClosedMinutes })}
              />
              <NumberField
                label="Dutch oven, lid off"
                suffix="min"
                value={scheduleInput.dutchOvenLidOffMinutes}
                min={5}
                step={5}
                info={scheduleFieldInfo.dutchOvenLidOffMinutes}
                onChange={(dutchOvenLidOffMinutes) => onScheduleChange({ dutchOvenLidOffMinutes })}
              />
              <NumberField
                label="Out of Dutch oven"
                suffix="min"
                value={scheduleInput.dutchOvenOutOfPotMinutes}
                min={3}
                step={1}
                info={scheduleFieldInfo.dutchOvenOutOfPotMinutes}
                onChange={(dutchOvenOutOfPotMinutes) => onScheduleChange({ dutchOvenOutOfPotMinutes })}
              />
            </>
          ) : (
            <>
              <NumberField
                label="Open bake"
                suffix="min"
                value={scheduleInput.openBakeMinutes}
                min={10}
                step={5}
                info={scheduleFieldInfo.openBakeMinutes}
                onChange={(openBakeMinutes) => onScheduleChange({ openBakeMinutes })}
              />
              <NumberField
                label="Finish bake"
                suffix="min"
                value={scheduleInput.finishMinutes}
                min={5}
                step={5}
                info={scheduleFieldInfo.finishMinutes}
                onChange={(finishMinutes) => onScheduleChange({ finishMinutes })}
              />
            </>
          )}
        </form>
      </section>

      <BakePlanTimeline steps={timeline} />

      <nav className="schedule-builder__footer wizard-nav" aria-label="Schedule navigation">
        <button type="button" className="wizard-button wizard-button--secondary" onClick={onBack}>
          Back to ingredient summary
        </button>
      </nav>
    </div>
  );
}
