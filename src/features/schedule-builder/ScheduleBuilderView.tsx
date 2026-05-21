import { useEffect, useMemo, useState } from 'react';

import { PageShell } from '../../components/PageShell.tsx';
import { StickyFooter } from '../../components/StickyFooter.tsx';
import { FieldLabel } from '../../components/FieldLabel.tsx';
import { CollapsibleSection } from '../../components/CollapsibleSection.tsx';
import { ArrowLeftIcon, LoafIcon, SaveIcon } from '../../components/icons.tsx';
import { Toast } from '../../components/Toast.tsx';
import { NumberField } from '../../components/NumberField.tsx';
import { SectionHeading } from '../../components/SectionHeading.tsx';
import { SelectField } from '../../components/SelectField.tsx';
import { ToggleField } from '../../components/ToggleField.tsx';
import { buildTimeline, formatTimelineForDisplay } from '../../lib/schedule/buildTimeline.ts';
import { calculateRecipe } from '../../lib/recipe/calculateRecipe.ts';
import { buildIngredientRows, formatIngredientListAsText } from '../../lib/recipe/formatIngredients.ts';
import { formatRecipeExportJson, formatScheduleAsText } from '../../lib/schedule/exportSchedule.ts';
import {
  getAutolyseRecommendation,
  getAutolyseTimeAdvice,
  getColdRetardAssessment,
  getColdRetardAssessmentLevel,
  getProofingStyleAdvice,
  getTotalBakeMinutes,
} from '../../lib/schedule/scheduleAdvice.ts';
import { getColdRetardHours, roundColdRetardHoursUp } from '../../lib/schedule/scheduleTiming.ts';
import { formatBakeDateLong, getBakeDateIso, getMixDateIso } from '../../lib/schedule/dates.ts';
import type { RecipeInput } from '../../lib/recipe/types.ts';
import type { ScheduleInput } from '../../lib/schedule/types.ts';
import { BakePlanTimeline } from './BakePlanTimeline.tsx';
import { scheduleFieldInfo } from './scheduleFieldInfo.ts';
import {
  describeStarterPrepPlan,
  formatRatioLabel,
  planStarterPrep,
} from '../../lib/schedule/levainPrep.ts';
import { bakeMethodOptions, proofingStyleOptions } from './scheduleOptions.ts';

type ScheduleBuilderViewProps = {
  recipeInput: RecipeInput;
  scheduleInput: ScheduleInput;
  recipeName: string;
  onScheduleChange: (patch: Partial<ScheduleInput>) => void;
  onBack: () => void;
  onSave: () => void;
  onStartBake: () => void;
  isStartingBake?: boolean;
};

export function ScheduleBuilderView({
  recipeInput,
  scheduleInput,
  recipeName,
  onScheduleChange,
  onBack,
  onSave,
  onStartBake,
  isStartingBake = false,
}: ScheduleBuilderViewProps) {
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const autolyseAdvice = useMemo(() => getAutolyseRecommendation(recipeInput), [recipeInput]);
  const autolyseTimeAdvice = useMemo(() => getAutolyseTimeAdvice(recipeInput), [recipeInput]);
  const proofingAdvice = useMemo(
    () => getProofingStyleAdvice(recipeInput, scheduleInput.proofingStyle),
    [recipeInput, scheduleInput.proofingStyle],
  );
  const timeline = useMemo(() => {
    try {
      return formatTimelineForDisplay(buildTimeline(scheduleInput, recipeInput));
    } catch {
      return [];
    }
  }, [scheduleInput, recipeInput]);
  const totalBakeMinutes = getTotalBakeMinutes(scheduleInput);
  const coldRetardHours = useMemo(
    () => getColdRetardHours(scheduleInput, recipeInput),
    [scheduleInput, recipeInput],
  );
  const coldRetardHoursRounded = roundColdRetardHoursUp(coldRetardHours);
  const coldRetardAssessment = useMemo(
    () => getColdRetardAssessment(coldRetardHours),
    [coldRetardHours],
  );
  const coldRetardAssessmentLevel = useMemo(
    () => getColdRetardAssessmentLevel(coldRetardHours),
    [coldRetardHours],
  );
  const mixDateLabel = formatBakeDateLong(getMixDateIso(scheduleInput));
  const bakeDateLabel = formatBakeDateLong(getBakeDateIso(scheduleInput, recipeInput));
  const formula = useMemo(() => {
    try {
      return calculateRecipe(recipeInput);
    } catch {
      return null;
    }
  }, [recipeInput]);
  const ingredientRows = useMemo(
    () => (formula ? buildIngredientRows(recipeInput, formula) : []),
    [formula, recipeInput],
  );
  const starterPrepPlan = useMemo(
    () =>
      planStarterPrep({
        buildHours: scheduleInput.levainBuildHours,
        roomTemperatureCelsius: recipeInput.roomTemperatureCelsius,
        levainActivity: recipeInput.levainActivity,
        starterFromFridge: scheduleInput.starterFromFridge,
      }),
    [
      scheduleInput.levainBuildHours,
      scheduleInput.starterFromFridge,
      recipeInput.levainActivity,
      recipeInput.roomTemperatureCelsius,
    ],
  );
  const levainBuildRatioLabel = formatRatioLabel(starterPrepPlan.levainBuildRatio);
  const starterPrepPlanDescription = describeStarterPrepPlan(starterPrepPlan);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    if (!exportMessage) {
      return;
    }

    const timer = window.setTimeout(() => setExportMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [exportMessage]);

  async function copyScheduleText(): Promise<void> {
    const text = formatScheduleAsText({
      recipeName,
      mixDateLabel,
      bakeDateLabel,
      steps: timeline,
    });
    await copyToClipboard(text);
    setExportMessage('Schedule copied');
  }

  async function copyIngredientList(): Promise<void> {
    if (!formula) {
      return;
    }

    const text = formatIngredientListAsText({
      recipeName,
      rows: ingredientRows,
    });
    await copyToClipboard(text);
    setExportMessage('Ingredient list copied');
  }

  async function copyRecipeJson(): Promise<void> {
    const json = formatRecipeExportJson({
      recipeName,
      recipeInput,
      scheduleInput,
      timeline,
    });
    await copyToClipboard(json);
    setExportMessage('Recipe JSON copied');
  }

  return (
    <PageShell
      className="schedule-builder"
      footer={
        <StickyFooter
          secondaryAction={
            <button type="button" className="page-shell__secondary-link" onClick={onSave}>
              <SaveIcon />
              Save recipe
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
        <h1>Schedule builder</h1>
        <p className="hero-copy">
          Mix on {mixDateLabel}. Bake on {bakeDateLabel}. Times below follow your start time on mix day.
        </p>
      </section>

      <section className="card">
        <SectionHeading
          title="Starter prep"
          copy="Steps before mix day. Levain build is timed back from your mix start. Feeding ratio adjusts for room temperature so the levain peaks at mix time."
          toggle={{
            checked: scheduleInput.includeStarterPrep,
            label: 'Show starter prep settings',
            onChange: (includeStarterPrep) => onScheduleChange({ includeStarterPrep }),
          }}
        />
        {scheduleInput.includeStarterPrep ? (
          <form className="field-grid field-grid--stacked schedule-starter-prep">
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
              step={0.25}
              onChange={(value) => onScheduleChange({ levainBuildHours: value })}
            />
            <p className="schedule-starter-prep__ratio" role="status">
              Suggested levain feeding: <strong>{levainBuildRatioLabel}</strong> for{' '}
              {scheduleInput.levainBuildHours}h at {recipeInput.roomTemperatureCelsius}°C.
              {' '}
              {starterPrepPlanDescription}
            </p>
          </form>
        ) : null}
      </section>

      <section className="card">
        <SectionHeading
          title="Mix day"
          copy="Choose when mixing begins and which calendar day that falls on."
        />
        <form className="field-grid field-grid--pair schedule-mix-form">
          <label className="field-card">
            <FieldLabel label="Mix date" info={scheduleFieldInfo.mixDate} />
            <input
              type="date"
              value={scheduleInput.mixDate}
              onChange={(event) => onScheduleChange({ mixDate: event.currentTarget.value })}
            />
          </label>
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
        <SectionHeading
          title="Mixing sequence"
          copy="Each incorporation step is followed by a rest."
        />
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
      </section>

      <section className="card">
        <SectionHeading
          title="Bulk and shaping"
          copy={`Bulk starts when levain is mixed in (${recipeInput.targetBulkHours}h target). Watch the dough for strength signs, especially towards the last folds, and adjust folding technique and timing accordingly.`}
        />
        <form className="field-grid field-grid--responsive">
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
        </form>
      </section>

      <section className="card">
        <SectionHeading
          title="Proofing"
          copy="Final rise after shaping — the dough relaxes, gains volume, and develops flavor before baking."
        />
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
              <label className="field-card">
                <FieldLabel
                  label="Desired bake time (day + 1)"
                  info={scheduleFieldInfo.desiredBakeTime}
                />
                <input
                  type="time"
                  value={scheduleInput.desiredBakeTime}
                  onChange={(event) => onScheduleChange({ desiredBakeTime: event.currentTarget.value })}
                />
              </label>
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
      </section>

      <section className="card">
        <SectionHeading
          title="Bake"
          copy={`Total bake time: ${totalBakeMinutes} min. Bake phase lengths and temperatures are scaled to your dough size.`}
        />
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
      </section>

      <BakePlanTimeline
        steps={timeline}
        mixDateLabel={mixDateLabel}
        bakeDateLabel={bakeDateLabel}
      />

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

      {exportMessage ? <Toast message={exportMessage} /> : null}
    </PageShell>
  );
}

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}
