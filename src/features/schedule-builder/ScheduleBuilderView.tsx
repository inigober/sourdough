import { useId, useState } from 'react';

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
  const customPanelId = useId();
  const exportPanelId = useId();
  const [isExportOpen, setIsExportOpen] = useState(false);

  const {
    exportMessage,
    selectedOptionId,
    pendingPreset,
    selectPlanOption,
    editSchedule,
    isStepEditable,
    editStep,
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
  const isCustomSelected = selectedOptionId === 'custom';

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
            <button type="button" className="button button--secondary schedule-builder__back" onClick={onBack}>
              <ArrowLeftIcon />
              Back
            </button>
            <button
              type="button"
              className="button button--primary schedule-builder__start"
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

      <SchedulePresetPicker
        selectedOptionId={selectedOptionId}
        onSelect={selectPlanOption}
        customPanelId={isCustomSelected ? customPanelId : undefined}
      />

      {isCustomSelected ? (
        <section id={customPanelId} className="card schedule-customise" aria-label="Custom plan settings">
          <p className="section-copy schedule-customise__copy">
            Fine-tune any step. The bake schedule below updates as you change things.
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
                onChange={(includeStarterPrep) => editSchedule({ includeStarterPrep })}
              />
              {scheduleInput.includeStarterPrep ? (
                <>
                  <ToggleField
                    label="Starter was in the fridge"
                    checked={scheduleInput.starterFromFridge}
                    onChange={(checked) => editSchedule({ starterFromFridge: checked })}
                  />
                  <NumberField
                    label="Levain build time"
                    suffix="h"
                    value={scheduleInput.levainBuildHours}
                    min={3}
                    max={18}
                    step={0.5}
                    onChange={(value) => editSchedule({ levainBuildHours: value })}
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
                  onChange={(event) => editSchedule({ startTime: event.currentTarget.value })}
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
                    onChange={(autolyseEnabled) => editSchedule({ autolyseEnabled })}
                  />
                  <ToggleField
                    label="Mix salt after levain"
                    checked={scheduleInput.saltAfterLevain}
                    info={scheduleFieldInfo.saltAfterLevain}
                    onChange={(saltAfterLevain) => editSchedule({ saltAfterLevain })}
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
                    onChange={(autolyseMinutes) => editSchedule({ autolyseMinutes })}
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
                    onChange={(restAfterLevainMinutes) => editSchedule({ restAfterLevainMinutes })}
                  />
                  <NumberField
                    label="Rest after mixing in salt"
                    suffix="min"
                    value={scheduleInput.restAfterSaltMinutes}
                    min={0}
                    step={5}
                    info={scheduleFieldInfo.restAfterSaltMinutes}
                    onChange={(restAfterSaltMinutes) => editSchedule({ restAfterSaltMinutes })}
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
                    onChange={(slapAndFolds) => editSchedule({ slapAndFolds })}
                  />
                  <NumberField
                    label="Rest after slap and folds"
                    suffix="min"
                    value={scheduleInput.restAfterSlapAndFoldMinutes}
                    min={0}
                    step={5}
                    info={scheduleFieldInfo.restAfterSlapAndFoldMinutes}
                    onChange={(restAfterSlapAndFoldMinutes) => editSchedule({ restAfterSlapAndFoldMinutes })}
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
                    onChange={(stretchAndFoldSets) => editSchedule({ stretchAndFoldSets })}
                  />
                  <NumberField
                    label="Rest between stretch and folds"
                    suffix="min"
                    value={scheduleInput.stretchAndFoldRestMinutes}
                    min={10}
                    step={5}
                    info={scheduleFieldInfo.stretchAndFoldRestMinutes}
                    onChange={(stretchAndFoldRestMinutes) => editSchedule({ stretchAndFoldRestMinutes })}
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
                    onChange={(coilFoldSets) => editSchedule({ coilFoldSets })}
                  />
                  <NumberField
                    label="Rest between coil folds"
                    suffix="min"
                    value={scheduleInput.coilFoldRestMinutes}
                    min={10}
                    step={5}
                    info={scheduleFieldInfo.coilFoldRestMinutes}
                    onChange={(coilFoldRestMinutes) => editSchedule({ coilFoldRestMinutes })}
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
                    onChange={(preShapeMinutesBeforeBulkEnd) => editSchedule({ preShapeMinutesBeforeBulkEnd })}
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
                onChange={(proofingStyle) => editSchedule({ proofingStyle })}
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
                      onChange={(event) => editSchedule({ desiredBakeTime: event.currentTarget.value })}
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
                  onChange={(roomProofHours) => editSchedule({ roomProofHours })}
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
                onChange={(bakeMethod) => editSchedule({ bakeMethod })}
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
                  onChange={(openBakeTempCelsius) => editSchedule({ openBakeTempCelsius })}
                />
                <NumberField
                  label="Finish temperature"
                  suffix="°C"
                  value={scheduleInput.finishTempCelsius}
                  min={160}
                  max={250}
                  step={5}
                  info={scheduleFieldInfo.finishTempCelsius}
                  onChange={(finishTempCelsius) => editSchedule({ finishTempCelsius })}
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
                    onChange={(dutchOvenClosedMinutes) => editSchedule({ dutchOvenClosedMinutes })}
                  />
                  <NumberField
                    label="Lid off"
                    suffix="min"
                    value={scheduleInput.dutchOvenLidOffMinutes}
                    min={5}
                    step={5}
                    info={scheduleFieldInfo.dutchOvenLidOffMinutes}
                    onChange={(dutchOvenLidOffMinutes) => editSchedule({ dutchOvenLidOffMinutes })}
                  />
                  <NumberField
                    label="Bake out of Dutch oven"
                    suffix="min"
                    value={scheduleInput.dutchOvenOutOfPotMinutes}
                    min={3}
                    step={1}
                    info={scheduleFieldInfo.dutchOvenOutOfPotMinutes}
                    onChange={(dutchOvenOutOfPotMinutes) => editSchedule({ dutchOvenOutOfPotMinutes })}
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
                    onChange={(openBakeMinutes) => editSchedule({ openBakeMinutes })}
                  />
                  <NumberField
                    label="Finish bake"
                    suffix="min"
                    value={scheduleInput.finishMinutes}
                    min={5}
                    step={5}
                    info={scheduleFieldInfo.finishMinutes}
                    onChange={(finishMinutes) => editSchedule({ finishMinutes })}
                  />
                </div>
              )}
            </form>
          </CollapsibleSection>
        </section>
      ) : null}

      <BakePlanTimeline
        steps={timeline}
        caption={`Times follow your start time. ${mixAndBakeSentence}`}
        isStepEditable={isStepEditable}
        onEditStep={editStep}
      />

      <div className="schedule-export">
        <button
          type="button"
          className="schedule-export__toggle"
          aria-expanded={isExportOpen}
          aria-controls={exportPanelId}
          onClick={() => setIsExportOpen((current) => !current)}
        >
          Export
        </button>
        {isExportOpen ? (
          <div id={exportPanelId} className="schedule-export__actions">
            <button type="button" className="schedule-export__action" disabled={!formula} onClick={() => void copyIngredientList()}>
              Copy ingredients
            </button>
            <button type="button" className="schedule-export__action" onClick={() => void copyScheduleText()}>
              Copy schedule
            </button>
            <button type="button" className="schedule-export__action" onClick={() => void copyRecipeJson()}>
              Copy recipe JSON
            </button>
          </div>
        ) : null}
      </div>

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
