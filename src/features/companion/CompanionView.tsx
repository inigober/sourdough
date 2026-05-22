import { useEffect, useMemo, useState } from 'react';

import { PageShell } from '../../components/PageShell.tsx';
import { buildTimeline, formatTimelineForDisplay } from '../../lib/schedule/buildTimeline.ts';
import { formatBakeDateLong, getBakeDateIso, getMixDateIso } from '../../lib/schedule/dates.ts';
import {
  formatTimerRemaining,
  getTimerRemainingSeconds,
} from '../../lib/companion/bakeTimer.ts';
import {
  advanceBakeSession,
  getCurrentTimelineStep,
  getPreviousTimelineStep,
  isBakeSessionComplete,
  jumpToBakeStep,
  restartStepTimer,
  retreatBakeSession,
  startTimedStep,
  updateBakeSessionSchedule,
} from '../../lib/companion/bakeSession.ts';
import {
  applyScheduleDriftToTimeline,
  canStartTimedStep,
  getDisplayStepTimes,
  isTimedStepRunning,
} from '../../lib/companion/liveSchedule.ts';
import { getStepScheduleEdit } from '../../lib/companion/stepScheduleEdits.ts';
import type { BakeSession } from '../../lib/companion/types.ts';
import { shouldShowTimelineDateLabel } from '../../lib/schedule/timelineDisplay.ts';
import { PenEditButton } from '../../components/PenEditButton.tsx';
import { SparklesIcon, RestartIcon } from '../../components/icons.tsx';
import { getCoachTopicForStepId } from '../../lib/companion/coachTopics.ts';
import type { ScheduleInput } from '../../lib/schedule/types.ts';
import { BakeCompleteDialog } from './BakeCompleteDialog.tsx';
import { CompanionCoachPanel } from './CompanionCoachPanel.tsx';
import { CompanionStepEditDialog } from './CompanionStepEditDialog.tsx';

type CompanionViewProps = {
  session: BakeSession;
  onSessionChange: (session: BakeSession) => void;
  onExit: (finished: boolean) => void;
};

export function CompanionView({ session, onSessionChange, onExit }: CompanionViewProps) {
  const [isEditingStep, setIsEditingStep] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [timerNow, setTimerNow] = useState(() => Date.now());

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
  const previousStep = getPreviousTimelineStep(timeline, session);
  const isComplete = isBakeSessionComplete(session, timeline.length);
  const canEditStep = currentStep ? Boolean(getStepScheduleEdit(currentStep.id)) : false;
  const stepIsRunning = isTimedStepRunning(session);
  const stepCanStart = currentStep ? canStartTimedStep(session, currentStep) : false;
  const coachTopic = currentStep ? getCoachTopicForStepId(currentStep.id) : null;
  const currentStepTimes = currentStep ? getDisplayStepTimes(session, currentStep) : null;
  const mixDateLabel = formatBakeDateLong(getMixDateIso(session.scheduleInput));
  const bakeDateLabel = formatBakeDateLong(
    getBakeDateIso(session.scheduleInput, session.recipeInput),
  );

  useEffect(() => {
    if (!session.activeTimerEndsAt) {
      return;
    }

    const interval = window.setInterval(() => setTimerNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [session.activeTimerEndsAt]);

  const timerRemainingSeconds = getTimerRemainingSeconds(session.activeTimerEndsAt, timerNow);

  function handleNextStep(): void {
    if (!currentStep) {
      return;
    }

    if (isComplete) {
      setShowCompleteDialog(true);
      return;
    }

    onSessionChange(advanceBakeSession(session, timeline.length, currentStep));
  }

  function handlePrevious(): void {
    onSessionChange(retreatBakeSession(session));
  }

  function handleJumpToStep(index: number): void {
    onSessionChange(jumpToBakeStep(session, index));
  }

  function handleSaveStepEdit(scheduleInput: ScheduleInput): void {
    onSessionChange(updateBakeSessionSchedule(session, scheduleInput));
    setIsEditingStep(false);
  }

  function handleStartStep(): void {
    if (!currentStep) {
      return;
    }

    onSessionChange(startTimedStep(session, currentStep));
    setTimerNow(Date.now());
  }

  function handleRestartTimer(): void {
    if (!currentStep || currentStep.durationMinutes <= 0) {
      return;
    }

    onSessionChange(restartStepTimer(session, currentStep));
    setTimerNow(Date.now());
  }

  if (!currentStep) {
    return (
      <PageShell className="companion">
        <section className="hero companion__hero">
          <h1>Bake mode</h1>
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
        <h1>{session.recipeName}</h1>
        <p className="hero-copy">
          Mix the dough on {mixDateLabel}. Oven-bake on {bakeDateLabel}.
        </p>
        <p className="companion__progress">
          Step {session.currentStepIndex + 1} of {timeline.length}
        </p>
        <p className="companion__coach-hint">
          Stuck on a step? Tap the sparkles button to ask the AI baking coach for help.
        </p>
        {session.scheduleDriftMinutes !== 0 ? (
          <p className="companion__drift" role="status">
            Remaining schedule shifted by {formatDriftLabel(session.scheduleDriftMinutes)} based on actual timing.
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
        {currentStep.detail ? <p className="companion__step-detail">{currentStep.detail}</p> : null}

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
          <div className="companion__timer" role="timer" aria-live="polite">
            <span className="companion__timer-label">Timer</span>
            <div className="companion__timer-display">
              <div className="companion__timer-main">
                <strong className="companion__timer-value">{formatTimerRemaining(timerRemainingSeconds)}</strong>
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

            return (
              <li key={step.id} className="companion__overview-item">
                <button
                  type="button"
                  className={`timeline-row timeline-row--interactive timeline-row--${variant}`}
                  onClick={() => handleJumpToStep(index)}
                >
                  <span className="companion-overview__time-col">
                    {showDateLabel && stepTimes.dateLabel ? (
                      <span className="timeline-row__date">{stepTimes.dateLabel}</span>
                    ) : null}
                    <span className="timeline-row__time-compact">{stepTimes.startTime}</span>
                  </span>
                  <span className="timeline-row__label-compact">{step.label}</span>
                </button>
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
          onClose={() => setIsCoachOpen(false)}
          onSessionChange={onSessionChange}
        />
      ) : null}

      {showCompleteDialog ? (
        <BakeCompleteDialog recipeName={session.recipeName} onClose={() => onExit(true)} />
      ) : null}

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

function formatDriftLabel(driftMinutes: number): string {
  const absolute = Math.abs(driftMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;

  if (hours > 0 && minutes > 0) {
    return `${driftMinutes > 0 ? '+' : '-'}${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${driftMinutes > 0 ? '+' : '-'}${hours}h`;
  }

  return `${driftMinutes > 0 ? '+' : '-'}${minutes}m`;
}
