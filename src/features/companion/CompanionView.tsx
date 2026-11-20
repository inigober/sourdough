import { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';

import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { PageShell } from '../../components/PageShell.tsx';
import { Toast } from '../../components/Toast.tsx';
import { buildTimeline, formatTimelineForDisplay } from '../../lib/schedule/buildTimeline.ts';
import { formatBakeDateLong, getBakeDateIso, getMixDateIso } from '../../lib/schedule/dates.ts';
import {
  formatTimerRemaining,
  getTimerRemainingSeconds,
} from '../../lib/companion/bakeTimer.ts';
import {
  formatTimerSpokenRemaining,
  getTimerFinishedAnnouncement,
  getTimerStartedAnnouncement,
} from '../../lib/companion/timerSpeech.ts';
import {
  advanceBakeSession,
  getCurrentTimelineStep,
  getForwardStepSkipCount,
  getNextTimelineStep,
  getPreviousTimelineStep,
  isBakeSessionComplete,
  jumpToBakeStep,
  restartStepTimer,
  restoreBakeSessionSnapshot,
  retreatBakeSession,
  startTimedStep,
  updateBakeSessionSchedule,
} from '../../lib/companion/bakeSession.ts';
import {
  applyScheduleDriftToTimeline,
  canStartTimedStep,
  formatDurationMinutes,
  getDisplayStepTimes,
  getEarlyStartMinutes,
  getMinutesUntilStep,
  isTimedStepRunning,
  shouldConfirmEarlyStart,
  stepEndsOnLaterDay,
} from '../../lib/companion/liveSchedule.ts';
import { getStepAmounts, getStepDetailWithoutAmounts } from '../../lib/companion/stepAmounts.ts';
import { getStepScheduleEdit } from '../../lib/companion/stepScheduleEdits.ts';
import { finalizeBakeSessionForHistory } from '../../lib/history/buildBakeHistorySteps.ts';
import type { BakeSession } from '../../lib/companion/types.ts';
import { shouldShowTimelineDateLabel } from '../../lib/schedule/timelineDisplay.ts';
import { PenEditButton } from '../../components/PenEditButton.tsx';
import { SparklesIcon, RestartIcon } from '../../components/icons.tsx';
import { getCoachTopicForStepId } from '../../lib/companion/coachTopics.ts';
import type { ScheduleInput } from '../../lib/schedule/types.ts';
import { BakeCompleteDialog, type BakeCompleteSaveInput } from './BakeCompleteDialog.tsx';
import { CompanionCoachPanel } from './CompanionCoachPanel.tsx';
import { CompanionStepAmounts } from './CompanionStepAmounts.tsx';
import { CompanionStepEditDialog } from './CompanionStepEditDialog.tsx';
import { CompanionBakeTimerPermissionNotice } from './CompanionBakeTimerPermissionNotice.tsx';
import {
  getBakeTimerTestOverrideMinutes,
  getBakeTimerTestOverrideNotice,
} from '../../lib/companion/bakeTimerTestOverride.ts';
import { useBakeKeepAwake } from '../../lib/companion/useBakeKeepAwake.ts';
import { useBakeNativeTimer } from '../../lib/companion/nativeBakeTimer/useBakeNativeTimer.ts';

/** How long the Undo toast stays after Next step / Jump. */
const UNDO_TOAST_MS = 8000;

type UndoAction = {
  message: string;
  snapshot: BakeSession;
};

type CompanionViewProps = {
  session: BakeSession;
  onSessionChange: (session: BakeSession) => void;
  onSaveBake: (input: BakeCompleteSaveInput) => Promise<void>;
  isSavingBake: boolean;
  saveBakeError: string | null;
  /** `discardBake: true` deletes the bake session; false keeps it so the bake can be resumed. */
  onExit: (discardBake: boolean) => void;
  /** The coach only answers signed-in bakers (the server enforces it); this just lets the sheet say so. */
  coachNeedsSignIn: boolean;
  onSignInForCoach: () => void;
};

export function CompanionView({
  session,
  onSessionChange,
  onSaveBake,
  isSavingBake,
  saveBakeError,
  onExit,
  coachNeedsSignIn,
  onSignInForCoach,
}: CompanionViewProps) {
  const [isEditingStep, setIsEditingStep] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [timerNow, setTimerNow] = useState(() => Date.now());
  // Minute-level clock for "Starts in" / "Next up" labels (the timer clock above only ticks while a timer runs).
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [pendingJumpIndex, setPendingJumpIndex] = useState<number | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [pendingEarlyStartMinutes, setPendingEarlyStartMinutes] = useState<number | null>(null);
  // Held while a screen-reader cursor, finger or pointer is on the Undo toast, so it does not vanish mid-reach.
  const [isUndoHeld, setIsUndoHeld] = useState(false);
  // Screen-reader announcements. The countdown itself is silent; these say when a timer starts and ends.
  const [timerStartedAnnouncement, setTimerStartedAnnouncement] = useState('');
  const [timerFinishedAnnouncement, setTimerFinishedAnnouncement] = useState('');

  useBakeKeepAwake();

  const timeline = useMemo(() => {
    const baseTimeline = formatTimelineForDisplay(
      buildTimeline(session.scheduleInput, session.recipeInput),
    );
    return applyScheduleDriftToTimeline(
      session.scheduleInput,
      baseTimeline,
      session.scheduleDriftMinutes,
    );
  }, [session.recipeInput, session.scheduleDriftMinutes, session.scheduleInput]);

  const currentStep = getCurrentTimelineStep(timeline, session);
  const { permissionNotice, ensurePermissionForStartTimer, openTimerSettings } = useBakeNativeTimer(
    session,
    currentStep ?? null,
  );
  const previousStep = getPreviousTimelineStep(timeline, session);
  const nextStep = getNextTimelineStep(timeline, session);
  const isComplete = isBakeSessionComplete(session, timeline.length);
  const timerTestOverrideMinutes = currentStep
    ? getBakeTimerTestOverrideMinutes(currentStep)
    : null;
  const canEditStep = currentStep ? Boolean(getStepScheduleEdit(currentStep.id)) : false;
  const stepIsRunning = isTimedStepRunning(session);
  const stepCanStart = currentStep ? canStartTimedStep(session, currentStep) : false;
  const coachTopic = currentStep ? getCoachTopicForStepId(currentStep.id) : null;
  const currentStepAmounts = currentStep
    ? getStepAmounts(currentStep.id, session.recipeInput, session.scheduleInput)
    : null;
  const currentStepDetail = currentStep
    ? getStepDetailWithoutAmounts(currentStep, currentStepAmounts !== null)
    : undefined;
  const currentStepTimes = currentStep ? getDisplayStepTimes(session, currentStep) : null;
  const currentStepEndsNextDay = currentStep ? stepEndsOnLaterDay(session, currentStep) : false;
  const currentStepStartsInMinutes =
    currentStep && !stepIsRunning ? getMinutesUntilStep(session, currentStep, clockNow) : 0;
  const nextStepStartsInMinutes = nextStep ? getMinutesUntilStep(session, nextStep, clockNow) : 0;
  // Web build only: the browser cannot ring with the screen off, native iOS can.
  const isWebBuild = !Capacitor.isNativePlatform();
  const mixDateLabel = formatBakeDateLong(getMixDateIso(session.scheduleInput));
  const bakeDateLabel = formatBakeDateLong(
    getBakeDateIso(session.scheduleInput, session.recipeInput),
  );

  useEffect(() => {
    if (!session.activeTimerEndsAt) {
      return;
    }

    const endsAt = session.activeTimerEndsAt;
    const now = Date.now();
    setTimerNow(now);

    // Already finished (e.g. resumed after leaving bake mode) — no need to keep ticking.
    if (getTimerRemainingSeconds(endsAt, now) === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      const tickNow = Date.now();
      setTimerNow(tickNow);
      if (getTimerRemainingSeconds(endsAt, tickNow) === 0) {
        window.clearInterval(interval);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [session.activeTimerEndsAt]);

  useEffect(() => {
    setClockNow(Date.now());
    const interval = window.setInterval(() => setClockNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!undoAction) {
      setIsUndoHeld(false);
      return;
    }

    if (isUndoHeld) {
      return;
    }

    const timeout = window.setTimeout(() => setUndoAction(null), UNDO_TOAST_MS);
    return () => window.clearTimeout(timeout);
  }, [isUndoHeld, undoAction]);

  const timerRemainingSeconds = getTimerRemainingSeconds(session.activeTimerEndsAt, timerNow);
  const hasTimerFinished = timerRemainingSeconds === 0 && isTimedStepRunning(session);
  const currentStepLabelForSpeech = currentStep?.label;

  // Clear the "timer started" sentence after it was read, so starting the same timer again is announced again.
  useEffect(() => {
    if (!timerStartedAnnouncement) {
      return;
    }

    const timeout = window.setTimeout(() => setTimerStartedAnnouncement(''), 4000);
    return () => window.clearTimeout(timeout);
  }, [timerStartedAnnouncement]);

  // Tell a screen-reader user when the timer reaches zero (once per timer), without ticking every second.
  useEffect(() => {
    if (hasTimerFinished && currentStepLabelForSpeech) {
      setTimerFinishedAnnouncement(getTimerFinishedAnnouncement(currentStepLabelForSpeech));
    } else {
      setTimerFinishedAnnouncement('');
    }
  }, [currentStepLabelForSpeech, hasTimerFinished, session.activeTimerEndsAt]);

  function offerUndo(message: string): void {
    setUndoAction({ message, snapshot: session });
  }

  function handleUndo(): void {
    if (!undoAction) {
      return;
    }

    onSessionChange(restoreBakeSessionSnapshot(session, undoAction.snapshot));
    setUndoAction(null);
  }

  function handleNextStep(): void {
    if (!currentStep) {
      return;
    }

    if (isComplete) {
      onSessionChange(finalizeBakeSessionForHistory(session, timeline));
      setShowCompleteDialog(true);
      return;
    }

    offerUndo(`Finished “${currentStep.label}”.`);
    onSessionChange(advanceBakeSession(session, timeline.length, currentStep));
  }

  function handlePrevious(): void {
    setUndoAction(null);
    onSessionChange(retreatBakeSession(session));
  }

  // A forward jump of more than one step discards the running timer and logs steps as
  // skipped, so it asks first. Everything else applies and offers Undo.
  function handleRequestJump(index: number): void {
    if (getForwardStepSkipCount(session, index) > 1) {
      setPendingJumpIndex(index);
      return;
    }

    performJump(index);
  }

  function performJump(index: number): void {
    const target = timeline[index];
    if (!target) {
      return;
    }

    offerUndo(`Jumped to “${target.label}”.`);
    setSelectedRowIndex(null);
    setPendingJumpIndex(null);
    onSessionChange(jumpToBakeStep(session, index, timeline));
  }

  function handleSaveStepEdit(scheduleInput: ScheduleInput): void {
    setUndoAction(null);
    onSessionChange(updateBakeSessionSchedule(session, scheduleInput));
    setIsEditingStep(false);
  }

  function handleStartStep(): void {
    if (!currentStep) {
      return;
    }

    if (shouldConfirmEarlyStart(session, currentStep)) {
      setPendingEarlyStartMinutes(getEarlyStartMinutes(session, currentStep));
      return;
    }

    void startStepNow();
  }

  async function startStepNow(): Promise<void> {
    if (!currentStep) {
      return;
    }

    setPendingEarlyStartMinutes(null);
    setUndoAction(null);
    await ensurePermissionForStartTimer();
    onSessionChange(startTimedStep(session, currentStep));
    setTimerNow(Date.now());
    setTimerStartedAnnouncement(
      getTimerStartedAnnouncement(currentStep.label, currentStep.durationMinutes * 60),
    );
  }

  function handleRestartTimer(): void {
    if (!currentStep || currentStep.durationMinutes <= 0) {
      return;
    }

    setUndoAction(null);
    onSessionChange(restartStepTimer(session, currentStep));
    setTimerNow(Date.now());
    setTimerStartedAnnouncement(
      getTimerStartedAnnouncement(currentStep.label, currentStep.durationMinutes * 60),
    );
  }

  if (!currentStep) {
    return (
      <PageShell className="companion">
        <section className="hero companion__hero">
          <p className="hero-copy">No schedule steps found for this recipe.</p>
        </section>
        <button type="button" className="wizard-button wizard-button--secondary" onClick={() => onExit(false)}>
          Back to home
        </button>
      </PageShell>
    );
  }

  return (
    <PageShell
      className="companion"
      footer={
        <div className="page-shell__footer">
          <nav className="wizard-nav wizard-nav--split" aria-label="Bake mode navigation">
          <button
            type="button"
            className="wizard-button wizard-button--secondary"
            disabled={session.currentStepIndex === 0}
            onClick={handlePrevious}
          >
            Previous
          </button>
          <button type="button" className="wizard-button wizard-button--primary" onClick={handleNextStep}>
            {isComplete ? 'Finish baking' : 'Next step'}
          </button>
          </nav>
        </div>
      }
    >
      <section className="hero companion__hero">
        <p className="companion__progress">
          Step {session.currentStepIndex + 1} of {timeline.length}
        </p>
        <details className="companion__about">
          <summary>About this bake</summary>
          <p className="hero-copy">
            Mix the dough on {mixDateLabel}. Oven-bake on {bakeDateLabel}. Stuck on a step? Tap the
            sparkles button to ask the AI baking coach for help.
          </p>
        </details>
        {isWebBuild ? (
          <p className="companion__web-banner" role="note">
            This web version can&apos;t alert you with the screen off. Use the iOS app or keep this
            screen open.
          </p>
        ) : null}
        {session.scheduleDriftMinutes !== 0 ? (
          <p className="companion__drift" role="status">
            {formatDriftNote(session.scheduleDriftMinutes)}
          </p>
        ) : null}
        {permissionNotice ? (
          <CompanionBakeTimerPermissionNotice
            title={permissionNotice.title}
            body={permissionNotice.body}
            showOpenSettings={permissionNotice.showOpenSettings}
            onOpenSettings={openTimerSettings}
          />
        ) : null}
        {timerTestOverrideMinutes !== null ? (
          <p className="companion__drift" role="status">
            {getBakeTimerTestOverrideNotice(timerTestOverrideMinutes)}
          </p>
        ) : null}
      </section>

      {previousStep ? (
        <section className="card companion__previous" aria-label="Previous step">
          <span className="companion__section-label">Previous</span>
          <strong>{previousStep.label}</strong>
          <span className="companion__previous-time">
            {formatStepTimeLabel(previousStep.startTime, previousStep.dateLabel)}
          </span>
        </section>
      ) : null}

      <section className="card companion__current" aria-label="Current step">
        <span className="companion__section-label companion__section-label--current">Current step</span>
        {currentStepTimes ? (
          <div className="companion__times">
            {currentStep.durationMinutes > 0 ? (
              <span>
                {formatStepTimeLabel(currentStepTimes.startTime, currentStepTimes.dateLabel)} –{' '}
                {currentStepTimes.endTime}
                {currentStepEndsNextDay ? ' (next day)' : ''}
              </span>
            ) : (
              <span>{formatStepTimeLabel(currentStepTimes.startTime, currentStepTimes.dateLabel)}</span>
            )}
          </div>
        ) : null}
        <div className="companion__step-header">
          <h2 className="companion__step-label">{currentStep.label}</h2>
          <button
            type="button"
            className="wizard-icon-button wizard-icon-button--help companion__coach-button"
            aria-label="Open AI baking coach"
            onClick={() => setIsCoachOpen(true)}
          >
            <SparklesIcon />
          </button>
        </div>
        {currentStepStartsInMinutes > 0 ? (
          <p className="companion__starts-in">Starts in {formatDurationMinutes(currentStepStartsInMinutes)}</p>
        ) : null}
        {currentStepDetail ? <p className="companion__step-detail">{currentStepDetail}</p> : null}
        {currentStepAmounts ? (
          // key: collapsed again on every new step
          <CompanionStepAmounts key={currentStep.id} amounts={currentStepAmounts} />
        ) : null}

        {stepCanStart || (canEditStep && !stepIsRunning) ? (
          <div className="companion__step-controls">
            {stepCanStart ? (
              <button type="button" className="wizard-button wizard-button--primary companion__start-step" onClick={handleStartStep}>
                Start timer
              </button>
            ) : null}
            {canEditStep && !stepIsRunning ? (
              <PenEditButton label={`Adjust ${currentStep.label}`} onClick={() => setIsEditingStep(true)} />
            ) : null}
          </div>
        ) : null}

        {timerRemainingSeconds !== null && stepIsRunning ? (
          <div className="companion__timer">
            <span className="companion__timer-label">Timer</span>
            <div className="companion__timer-display">
              <div className="companion__timer-main">
                {/* role=timer is silent by default (aria-live off), so the countdown is read only when focused.
                    "12:30" would be spoken as a clock time, so the spoken text is words. */}
                <strong className="companion__timer-value" role="timer" aria-live="off">
                  <span aria-hidden="true">{formatTimerRemaining(timerRemainingSeconds)}</span>
                  <span className="visually-hidden">{formatTimerSpokenRemaining(timerRemainingSeconds)}</span>
                </strong>
                {timerRemainingSeconds === 0 ? (
                  <span className="companion__timer-done">Time&apos;s up</span>
                ) : null}
              </div>
              <div className="companion__timer-actions">
                {timerRemainingSeconds > 0 ? (
                  <button
                    type="button"
                    className="wizard-icon-button wizard-icon-button--accent"
                    aria-label="Restart timer"
                    onClick={handleRestartTimer}
                  >
                    <RestartIcon />
                  </button>
                ) : null}
                {canEditStep ? (
                  <PenEditButton
                    label={`Adjust ${currentStep.label}`}
                    onClick={() => setIsEditingStep(true)}
                  />
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {nextStep ? (
          <p className="companion__next-up">
            Next up: <strong>{nextStep.label}</strong> at{' '}
            {formatStepTimeLabel(nextStep.startTime, nextStep.dateLabel)}
            {nextStepStartsInMinutes > 0 ? ` (in ${formatDurationMinutes(nextStepStartsInMinutes)})` : ''}
          </p>
        ) : null}
      </section>

      <section className="card companion__overview" aria-label="Full schedule">
        <h2 className="companion__overview-title">Full schedule</h2>
        <ol className="timeline-list companion__overview-list">
          {timeline.map((step, index) => {
            const stepTimes =
              index === session.currentStepIndex ? getDisplayStepTimes(session, step) : step;
            const variant =
              index === session.currentStepIndex
                ? 'current'
                : index < session.currentStepIndex
                  ? 'done'
                  : 'default';
            const showDateLabel = shouldShowTimelineDateLabel(timeline, index);
            const isCurrent = index === session.currentStepIndex;
            const isSelected = selectedRowIndex === index && !isCurrent;
            const startsInMinutes =
              index > session.currentStepIndex ? getMinutesUntilStep(session, step, clockNow) : 0;

            return (
              <li key={step.id} className="companion__overview-item">
                <button
                  type="button"
                  className={`timeline-row timeline-row--interactive timeline-row--${variant}${
                    showDateLabel && stepTimes.dateLabel ? ' timeline-row--dated-interactive' : ''
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-expanded={isCurrent ? undefined : isSelected}
                  onClick={() => setSelectedRowIndex(isCurrent || isSelected ? null : index)}
                >
                  {showDateLabel && stepTimes.dateLabel ? (
                    <span className="timeline-row__date">{stepTimes.dateLabel}</span>
                  ) : null}
                  <span className="timeline-row__time-compact">{stepTimes.startTime}</span>
                  <span className="timeline-row__label-compact">
                    {variant === 'done' ? <span className="visually-hidden">Done: </span> : null}
                    {step.label}
                    {startsInMinutes > 0 ? (
                      <span className="timeline-row__starts-in">
                        Starts in {formatDurationMinutes(startsInMinutes)}
                      </span>
                    ) : null}
                  </span>
                </button>
                {isSelected ? (
                  <div className="companion__row-actions">
                    <button
                      type="button"
                      className="wizard-button wizard-button--secondary"
                      onClick={() => handleRequestJump(index)}
                    >
                      Jump to this step
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      <button type="button" className="wizard-button wizard-button--secondary companion__exit" onClick={() => onExit(false)}>
        Exit bake mode
      </button>

      {isCoachOpen && currentStep && coachTopic ? (
        <CompanionCoachPanel
          session={session}
          topic={coachTopic}
          stepId={currentStep.id}
          stepLabel={currentStep.label}
          stepDetail={currentStep.detail}
          needsSignIn={coachNeedsSignIn}
          onSignIn={onSignInForCoach}
          onClose={() => setIsCoachOpen(false)}
          onSessionChange={onSessionChange}
        />
      ) : null}

      {showCompleteDialog ? (
        <BakeCompleteDialog
          recipeName={session.recipeName}
          isSaving={isSavingBake}
          saveError={saveBakeError}
          onSave={onSaveBake}
          onNotNow={() => onExit(false)}
          onDiscard={() => onExit(true)}
        />
      ) : null}

      {pendingJumpIndex !== null ? (
        <ConfirmDialog
          title={`Skip ${getForwardStepSkipCount(session, pendingJumpIndex)} steps?`}
          message={`${stepIsRunning ? 'Your running timer will stop. ' : ''}The steps in between will be logged as skipped.`}
          confirmLabel="Skip steps"
          onCancel={() => setPendingJumpIndex(null)}
          onConfirm={() => performJump(pendingJumpIndex)}
        />
      ) : null}

      {pendingEarlyStartMinutes !== null ? (
        <ConfirmDialog
          title="Start this step early?"
          message={`This step is planned for ${formatStepTimeLabel(
            currentStep.startTime,
            currentStep.dateLabel,
          )}. Start now and move the rest of the plan ${formatDurationMinutes(pendingEarlyStartMinutes)} earlier?`}
          confirmLabel="Start now"
          onCancel={() => setPendingEarlyStartMinutes(null)}
          onConfirm={() => void startStepNow()}
        />
      ) : null}

      {undoAction && !showCompleteDialog ? (
        <Toast
          message={undoAction.message}
          actionLabel="Undo"
          onAction={handleUndo}
          onHoldChange={setIsUndoHeld}
          placement="above-footer"
        />
      ) : null}

      {/* Always in the page, empty until there is something to say: that is what makes screen readers announce it. */}
      <div className="visually-hidden" role="status" aria-live="polite">
        {timerStartedAnnouncement}
      </div>
      <div className="visually-hidden" role="alert">
        {timerFinishedAnnouncement}
      </div>

      {isEditingStep && currentStep ? (
        <CompanionStepEditDialog
          step={currentStep}
          scheduleInput={session.scheduleInput}
          onCancel={() => setIsEditingStep(false)}
          onSave={handleSaveStepEdit}
        />
      ) : null}
    </PageShell>
  );
}

function formatStepTimeLabel(time: string, dateLabel?: string): string {
  return dateLabel ? `${dateLabel} ${time}` : time;
}

function formatDriftNote(driftMinutes: number): string {
  const direction = driftMinutes > 0 ? 'later' : 'earlier';
  return `The remaining schedule moved ${formatDurationMinutes(driftMinutes)} ${direction}, based on your actual timing.`;
}
