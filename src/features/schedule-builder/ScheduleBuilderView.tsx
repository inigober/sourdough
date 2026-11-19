import { useId } from 'react';

import { PageShell } from '../../components/PageShell.tsx';
import { StickyFooter } from '../../components/StickyFooter.tsx';
import { FieldLabel } from '../../components/FieldLabel.tsx';
import { CollapsibleSection } from '../../components/CollapsibleSection.tsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { ArrowLeftIcon, LoafIcon, SaveIcon } from '../../components/icons.tsx';
import { Toast } from '../../components/Toast.tsx';
import { NumberField } from '../../components/NumberField.tsx';
import { SelectField } from '../../components/SelectField.tsx';
import { ToggleField } from '../../components/ToggleField.tsx';
import type { RecipeInput } from '../../lib/recipe/types.ts';
import type { ScheduleInput } from '../../lib/schedule/types.ts';
import { BakePlanTimeline } from './BakePlanTimeline.tsx';
import { SchedulePresetPicker } from './SchedulePresetPicker.tsx';
import { describePresetChanges } from './schedulePresetCopy.ts';
import { scheduleFieldHints, scheduleFieldInfo } from './scheduleFieldInfo.ts';
import { bakeMethodOptions, proofingStyleOptions } from './scheduleOptions.ts';
import { useScheduleBuilder } from './useScheduleBuilder.ts';

type ScheduleBuilderViewProps = {
  recipeInput: RecipeInput;
  scheduleInput: ScheduleInput;
  recipeName: string;
  onScheduleChange: (patch: Partial<ScheduleInput>) => void;
  onBack: () => void;
  onSave: () => void;
  onStartBake: () => void;
  isStartingBake?: boolean;
  isSavedRecipe?: boolean;
};

function FieldHint({ children }: { children: string }) {
  return <p className="schedule-field-hint">{children}</p>;
}

export function ScheduleBuilderView({
  recipeInput,
  scheduleInput,
  recipeName,
  onScheduleChange,
  onBack,
  onSave,
  onStartBake,
  isStartingBake = false,
  isSavedRecipe = false,
}: ScheduleBuilderViewProps) {
  const startTimeInputId = useId();
  const desiredBakeTimeInputId = useId();

  const {
    exportMessage,
    matchedPresetId,
    pendingPreset,
    choosePreset,
    confirmPendingPreset,
    cancelPendingPreset,
    autolyseAdvice,
    autolyseTimeAdvice,
    proofingAdvice,
    timeline,
    totalBakeMinutes,
    coldRetardHoursRounded,
    coldRetardAssessment,
    coldRetardAssessmentLevel,
    mixAndBakeSentence,
    formula,
    levainBuildRatioLabel,
    starterPrepPlanDescription,
    levainBuildAmountsLabel,
    copyScheduleText,
    copyIngredientList,
    copyRecipeJson,
  } = useScheduleBuilder({ recipeInput, scheduleInput, recipeName, onScheduleChange });

  return (
    <PageShell
      className="schedule-builder"
      footer={
        <StickyFooter
          secondaryAction={
            <button type="button" className="page-shell__secondary-link" onClick={onSave}>
              <SaveIcon />
              {isSavedRecipe ? 'Update recipe' : 'Save recipe'}
            </button>
          }
        >
          <nav className="wizard-nav wizard-nav--split" aria-label="Schedule navigation">
            <button type="button" className="wizard-button wizard-button--secondary schedule-builder__back" onClick={onBack}>
              <ArrowLeftIcon />
              Back
            </button>
            <button
              type="button"
              className="wizard-button wizard-button--primary schedule-builder__start"
              disabled={isStartingBake}
              onClick={onStartBake}
            >
              <LoafIcon />
              {isStartingBake ? 'Starting…' : 'Start baking'}
            </button>
          </nav>
        </StickyFooter>
      }
    >
      <section className="hero schedule-builder__hero">
        <p className="hero-copy">
          {mixAndBakeSentence} Days count back from bake day, so this plan works on any date. You will pick the
          real date and time when you start baking.
        </p>
      </section>

      <SchedulePresetPicker selectedPresetId={matchedPresetId} onSelect={choosePreset} />

      <BakePlanTimeline steps={timeline} caption={`Times follow your start time. ${mixAndBakeSentence}`} />

      <div className="schedule-customise">
        <CollapsibleSection title="Customise" defaultOpen={false}>
          <p className="section-copy schedule-customise__copy">
            Fine-tune any step. The timeline above updates as you change things, and the plan switches to Custom.
          </p>

          <CollapsibleSection title="Starter prep">
            <p className="section-copy">
              Steps before mix day. The levain build is timed backward from mix start, and the feeding ratio adjusts
              for your room temperature.
            </p>
            <FieldHint>{scheduleFieldHints.levain}</FieldHint>
            <form className="field-grid field-grid--stacked schedule-starter-prep">
              <ToggleField
                label="Include starter prep steps"
                checked={scheduleInput.includeStarterPrep}
                onChange={(includeStarterPrep) => onScheduleChange({ includeStarterPrep })}
              />
              {scheduleInput.includeStarterPrep ? (
                <>
                  <ToggleField
                    label="Starter was in the fridge"
                    checked={scheduleInput.starterFromFridge}
                    onChange={(checked) => onScheduleChange({ starterFromFridge: checked })}
                  />
                  <NumberField
                    label="Levain build time"
                    suffix="h"
                    value={scheduleInput.levainBuildHours}
                    min={3}
                    max={18}
                    step={0.5}
                    onChange={(value) => onScheduleChange({ levainBuildHours: value })}
                  />
                  <p className="schedule-starter-prep__ratio" role="status">
                    Suggested feeding for a {scheduleInput.levainBuildHours}h build at{' '}
                    {recipeInput.roomTemperatureCelsius}°C
                    {scheduleInput.starterFromFridge ? ' (fridge starter — inactive until refreshed)' : ''}:{' '}
                    <strong>{levainBuildRatioLabel}</strong>. {starterPrepPlanDescription}
                  </p>
                  {levainBuildAmountsLabel ? (
                    <p className="schedule-starter-prep__amounts" role="status">
                      Levain to build: <strong>{levainBuildAmountsLabel}</strong> — includes{' '}
                      {scheduleInput.levainBufferPercent}% extra margin for scrape and transfer.
                    </p>
                  ) : null}
                </>
              ) : null}
            </form>
          </CollapsibleSection>

          <CollapsibleSection title="Start time and mixing">
            <p className="section-copy">
              The usual time you begin mixing. Every step is timed from it. Each incorporation step is followed by a
              rest.
            </p>
            <form className="field-grid field-grid--stacked schedule-mix-form">
              <div className="field-card">
                <FieldLabel label="Start time" info={scheduleFieldInfo.startTime} htmlFor={startTimeInputId} />
                <input
                  id={startTimeInputId}
                  type="time"
                  value={scheduleInput.startTime}
                  onChange={(event) => onScheduleChange({ startTime: event.currentTarget.value })}
                />
              </div>
            </form>
            <ol className="schedule-sequence">
              <li className="schedule-sequence__step schedule-sequence__step--toggles">
                <div className="field-grid field-grid--pair">
                  <ToggleField
                    label="Autolyse"
                    checked={scheduleInput.autolyseEnabled}
                    info={autolyseAdvice.summary}
                    onChange={(autolyseEnabled) => onScheduleChange({ autolyseEnabled })}
                  />
                  <ToggleField
                    label="Mix salt after levain"
                    checked={scheduleInput.saltAfterLevain}
                    info={scheduleFieldInfo.saltAfterLevain}
                    onChange={(saltAfterLevain) => onScheduleChange({ saltAfterLevain })}
                  />
                </div>
                <FieldHint>{scheduleFieldHints.autolyse}</FieldHint>
                {scheduleInput.autolyseEnabled ? (
                  <NumberField
                    label="Autolyse time"
                    suffix="min"
                    value={scheduleInput.autolyseMinutes}
                    min={0}
                    step={5}
                    info={autolyseTimeAdvice}
                    onChange={(autolyseMinutes) => onScheduleChange({ autolyseMinutes })}
                  />
                ) : null}
              </li>

              <li className="schedule-sequence__step">
                <div className="field-grid field-grid--pair">
                  <NumberField
                    label="Rest after mixing in levain"
                    suffix="min"
                    value={scheduleInput.restAfterLevainMinutes}
                    min={0}
                    step={5}
                    info={scheduleFieldInfo.restAfterLevainMinutes}
                    onChange={(restAfterLevainMinutes) => onScheduleChange({ restAfterLevainMinutes })}
                  />
                  <NumberField
                    label="Rest after mixing in salt"
                    suffix="min"
                    value={scheduleInput.restAfterSaltMinutes}
                    min={0}
                    step={5}
                    info={scheduleFieldInfo.restAfterSaltMinutes}
                    onChange={(restAfterSaltMinutes) => onScheduleChange({ restAfterSaltMinutes })}
                  />
                </div>
              </li>
            </ol>
          </CollapsibleSection>

          <CollapsibleSection title="Folding and shaping">
            <p className="section-copy">
              {`Bulk starts when levain is mixed in (${recipeInput.targetBulkHours}h target). Watch the dough for strength signs, especially towards the last folds, and adjust folding technique and timing accordingly.`}
            </p>
            <form className="schedule-fold-groups">
              <div className="schedule-fold-group">
                <div className="field-grid field-grid--pair">
                  <NumberField
                    label="Slap and folds"
                    value={scheduleInput.slapAndFolds}
                    min={0}
                    max={200}
                    step={5}
                    info={scheduleFieldInfo.slapAndFolds}
                    onChange={(slapAndFolds) => onScheduleChange({ slapAndFolds })}
                  />
                  <NumberField
                    label="Rest after slap and folds"
                    suffix="min"
                    value={scheduleInput.restAfterSlapAndFoldMinutes}
                    min={0}
                    step={5}
                    info={scheduleFieldInfo.restAfterSlapAndFoldMinutes}
                    onChange={(restAfterSlapAndFoldMinutes) => onScheduleChange({ restAfterSlapAndFoldMinutes })}
                  />
                </div>
                <FieldHint>{scheduleFieldHints.slapAndFold}</FieldHint>
              </div>
              <div className="schedule-fold-group">
                <div className="field-grid field-grid--pair">
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
                </div>
                <FieldHint>{scheduleFieldHints.stretchAndFold}</FieldHint>
              </div>
              <div className="schedule-fold-group">
                <div className="field-grid field-grid--pair">
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
                </div>
                <FieldHint>{scheduleFieldHints.coilFold}</FieldHint>
              </div>
              <div className="schedule-fold-group">
                <div className="field-grid field-grid--pair">
                  <NumberField
                    label="Pre-shape before bulk ends"
                    suffix="min"
                    value={scheduleInput.preShapeMinutesBeforeBulkEnd}
                    min={10}
                    step={5}
                    info={scheduleFieldInfo.preShapeMinutesBeforeBulkEnd}
                    onChange={(preShapeMinutesBeforeBulkEnd) => onScheduleChange({ preShapeMinutesBeforeBulkEnd })}
                  />
                </div>
                <FieldHint>{scheduleFieldHints.preShape}</FieldHint>
              </div>
            </form>
          </CollapsibleSection>

          <CollapsibleSection title="Proofing">
            <p className="section-copy">
              Final rise after shaping — the dough relaxes, gains volume, and develops flavor before baking.
            </p>
            <form
              className={
                scheduleInput.proofingStyle === 'cold'
                  ? 'schedule-proofing-form schedule-proofing-form--cold'
                  : 'schedule-proofing-form'
              }
            >
              <SelectField
                label="Proofing style"
                value={scheduleInput.proofingStyle}
                options={proofingStyleOptions}
                info={proofingAdvice}
                onChange={(proofingStyle) => onScheduleChange({ proofingStyle })}
              />
              {scheduleInput.proofingStyle === 'cold' ? (
                <>
                  <div className="field-card">
                    <FieldLabel
                      label="Desired bake time (day + 1)"
                      info={scheduleFieldInfo.desiredBakeTime}
                      htmlFor={desiredBakeTimeInputId}
                    />
                    <input
                      id={desiredBakeTimeInputId}
                      type="time"
                      value={scheduleInput.desiredBakeTime}
                      onChange={(event) => onScheduleChange({ desiredBakeTime: event.currentTarget.value })}
                    />
                  </div>
                  <div
                    className={`calculated-result calculated-result--${coldRetardAssessmentLevel}`}
                    role="status"
                    aria-live="polite"
                  >
                    <span className="calculated-result__label">Calculated</span>
                    <strong className="calculated-result__value">~{coldRetardHoursRounded}h cold retard</strong>
                    <span className="calculated-result__separator" aria-hidden="true">
                      ·
                    </span>
                    <span className="calculated-result__assessment">{coldRetardAssessment}</span>
                  </div>
                  <FieldHint>{scheduleFieldHints.coldRetard}</FieldHint>
                </>
              ) : (
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
              )}
            </form>
          </CollapsibleSection>

          <CollapsibleSection title="Baking">
            <p className="section-copy">
              {`Total bake time: ${totalBakeMinutes} min. Bake phase lengths and temperatures are scaled to your dough size.`}
            </p>
            <form className="schedule-bake-form">
              <SelectField
                label="Bake method"
                value={scheduleInput.bakeMethod}
                options={bakeMethodOptions}
                info={scheduleFieldInfo.bakeMethod}
                onChange={(bakeMethod) => onScheduleChange({ bakeMethod })}
              />
              <div className="field-grid field-grid--pair">
                <NumberField
                  label="Start temperature"
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
              </div>
              {scheduleInput.bakeMethod === 'dutchOven' ? (
                <div className="field-grid field-grid--triple schedule-bake-minutes">
                  <NumberField
                    label="Lid on"
                    suffix="min"
                    value={scheduleInput.dutchOvenClosedMinutes}
                    min={10}
                    step={5}
                    info={scheduleFieldInfo.dutchOvenClosedMinutes}
                    onChange={(dutchOvenClosedMinutes) => onScheduleChange({ dutchOvenClosedMinutes })}
                  />
                  <NumberField
                    label="Lid off"
                    suffix="min"
                    value={scheduleInput.dutchOvenLidOffMinutes}
                    min={5}
                    step={5}
                    info={scheduleFieldInfo.dutchOvenLidOffMinutes}
                    onChange={(dutchOvenLidOffMinutes) => onScheduleChange({ dutchOvenLidOffMinutes })}
                  />
                  <NumberField
                    label="Bake out of Dutch oven"
                    suffix="min"
                    value={scheduleInput.dutchOvenOutOfPotMinutes}
                    min={3}
                    step={1}
                    info={scheduleFieldInfo.dutchOvenOutOfPotMinutes}
                    onChange={(dutchOvenOutOfPotMinutes) => onScheduleChange({ dutchOvenOutOfPotMinutes })}
                  />
                </div>
              ) : (
                <div className="field-grid field-grid--pair schedule-bake-minutes">
                  <NumberField
                    label="Start bake"
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
                </div>
              )}
            </form>
          </CollapsibleSection>
        </CollapsibleSection>
      </div>

      <CollapsibleSection title="Export" defaultOpen={false}>
        <p className="section-copy schedule-export__copy">
          Copy your bake schedule or full recipe data to share or back up.
        </p>
        <div className="schedule-export__actions">
          <button
            type="button"
            className="wizard-button wizard-button--secondary"
            disabled={!formula}
            onClick={() => void copyIngredientList()}
          >
            Copy ingredients
          </button>
          <button type="button" className="wizard-button wizard-button--secondary" onClick={() => void copyScheduleText()}>
            Copy schedule
          </button>
          <button type="button" className="wizard-button wizard-button--secondary" onClick={() => void copyRecipeJson()}>
            Copy recipe JSON
          </button>
        </div>
      </CollapsibleSection>

      {pendingPreset ? (
        <ConfirmDialog
          title="Replace your settings?"
          message={describePresetChanges(pendingPreset.info, pendingPreset.changes)}
          confirmLabel={`Use ${pendingPreset.info.label}`}
          onCancel={cancelPendingPreset}
          onConfirm={confirmPendingPreset}
        />
      ) : null}

      {exportMessage ? <Toast message={exportMessage} /> : null}
    </PageShell>
  );
}
