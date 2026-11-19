import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';

import { compressCoachPhoto, getCoachPhotoCompressionOptions } from '../../lib/companion/compressCoachPhoto.ts';
import { buildCoachPrompt } from '../../lib/companion/buildCoachPrompt.ts';
import { buildCoachLiveContext } from '../../lib/companion/coachLiveContext.ts';
import { getCoachTipForStep } from '../../lib/companion/coachStepTips.ts';
import { getCoachQuickQuestions, type CoachTopic } from '../../lib/companion/coachTopics.ts';
import {
  getCoachFailureMessage,
  isRetryableCoachFailure,
  type CoachFailureReason,
} from '../../lib/companion/coachErrors.ts';
import {
  canAskCoachQuestion,
  formatCoachQuestionsRemaining,
  isLastCoachQuestion,
} from '../../lib/companion/coachLimits.ts';
import { recordCoachExchange } from '../../lib/companion/coachTranscript.ts';
import { requestCoachReply } from '../../lib/companion/requestCoachReply.ts';
import type { BakeSession, CoachTranscriptMessage } from '../../lib/companion/types.ts';
import { buildTimeline, formatTimelineForDisplay } from '../../lib/schedule/buildTimeline.ts';
import { CameraIcon, CloseIcon } from '../../components/icons.tsx';

const PHOTO_ONLY_QUESTION = 'What can you tell me from this photo?';

type CoachFailure = {
  reason: CoachFailureReason;
  message: string;
};

type CompanionCoachPanelProps = {
  session: BakeSession;
  topic: CoachTopic;
  stepId: string;
  stepLabel: string;
  stepDetail?: string;
  onClose: () => void;
  onSessionChange: (session: BakeSession) => void;
};

export function CompanionCoachPanel({
  session,
  topic,
  stepId,
  stepLabel,
  stepDetail,
  onClose,
  onSessionChange,
}: CompanionCoachPanelProps) {
  const [draft, setDraft] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [failure, setFailure] = useState<CoachFailure | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  // The reply arrives after an await, by which time the `session` prop in this closure may be stale
  // (timers keep ticking). Always save on top of the latest rendered session.
  const latestSessionRef = useRef(session);
  latestSessionRef.current = session;
  const isMountedRef = useRef(true);
  const inputId = useId();
  const canAskQuestion = canAskCoachQuestion(session.coachQuestionsAsked);
  const questionsRemainingLabel = formatCoachQuestionsRemaining(session.coachQuestionsAsked);
  const quickQuestions = useMemo(() => getCoachQuickQuestions(stepId), [stepId]);
  const introTip = useMemo(
    () => getCoachTipForStep(stepId, stepLabel, session.recipeInput),
    [stepId, stepLabel, session.recipeInput],
  );
  const savedMessages = session.coachTranscript ?? [];
  const pendingQuestionText = draft.trim() || PHOTO_ONLY_QUESTION;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // An explicit 'smooth' ignores the CSS reduced-motion rule, so check the setting here.
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, [savedMessages.length, isSending]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await sendQuestion();
  }

  async function sendQuestion(): Promise<void> {
    if (isSending) {
      return;
    }

    const question = draft.trim();
    if (!question && !pendingPhoto) {
      return;
    }

    if (!canAskQuestion) {
      setFailure({ reason: 'limit', message: getCoachFailureMessage('limit') });
      return;
    }

    const questionText = question || PHOTO_ONLY_QUESTION;
    const photoDataUrl = pendingPhoto ?? undefined;

    // The draft and photo stay in place until a reply succeeds, so a failure loses nothing.
    setFailure(null);
    setIsSending(true);

    try {
      const prompt = buildCoachPrompt({
        topic,
        stepId,
        stepLabel,
        stepDetail,
        recipeName: session.recipeName,
        recipeInput: session.recipeInput,
        scheduleInput: session.scheduleInput,
        userQuestion: questionText,
        hasPhoto: Boolean(photoDataUrl),
        liveContext: tryBuildLiveContext(latestSessionRef.current),
      });

      const result = await requestCoachReply({
        ...prompt,
        photoDataUrl,
        coachQuestionsAsked: session.coachQuestionsAsked,
      });

      // The sheet was closed mid-request: saving on a stale session could undo step progress,
      // and nothing was counted, so the baker can simply ask again.
      if (!isMountedRef.current) {
        return;
      }

      if (result.ok) {
        // Transcript and quota slot are saved together, only now that a reply exists.
        onSessionChange(
          recordCoachExchange(latestSessionRef.current, {
            question: questionText,
            hadPhoto: Boolean(photoDataUrl),
            reply: result.reply,
            stepId,
            stepLabel,
          }),
        );
        setDraft('');
        setPendingPhoto(null);
        return;
      }

      setFailure({ reason: result.reason, message: result.message });
    } finally {
      if (isMountedRef.current) {
        setIsSending(false);
      }
    }
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    if (!file) {
      return;
    }

    setPhotoError(null);
    setIsPreparingPhoto(true);

    try {
      const compressed = await compressCoachPhoto(file, getCoachPhotoCompressionOptions(topic));
      setPendingPhoto(compressed);
    } catch (error) {
      setPendingPhoto(null);
      setPhotoError(error instanceof Error ? error.message : 'Could not prepare that photo.');
    } finally {
      setIsPreparingPhoto(false);
    }
  }

  function handleQuickQuestion(question: string): void {
    setDraft(question);
    setFailure(null);
    textInputRef.current?.focus();
  }

  let lastShownStepId = stepId;

  return (
    <div className="companion-coach" role="dialog" aria-modal="true" aria-labelledby="companion-coach-title">
      <div className="companion-coach__backdrop" onClick={onClose} aria-hidden="true" />
      <section className="companion-coach__panel">
        <header className="companion-coach__header">
          <div>
            <h2 id="companion-coach-title">Baking coach</h2>
            <p className="companion-coach__subtitle">{stepLabel}</p>
            <p
              className={
                isLastCoachQuestion(session.coachQuestionsAsked)
                  ? 'companion-coach__quota companion-coach__quota--last'
                  : 'companion-coach__quota'
              }
            >
              {questionsRemainingLabel}
            </p>
            <p className="companion-coach__framing">
              AI guidance based on your recipe and photo. When unsure, trust the dough.
            </p>
          </div>
          <button type="button" className="wizard-icon-button companion-coach__close" aria-label="Close coach" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <div className="companion-coach__transcript" ref={transcriptRef}>
          <article className="companion-coach__message companion-coach__message--assistant">
            <p>{introTip}</p>
          </article>
          {savedMessages.map((message) => {
            const showStepNote = shouldShowStepNote(message, lastShownStepId);
            if (message.role === 'user') {
              lastShownStepId = message.stepId;
            }

            return (
              <SavedCoachMessage key={message.id} message={message} showStepNote={showStepNote} />
            );
          })}
          {isSending ? (
            <article className="companion-coach__message companion-coach__message--user">
              {pendingPhoto ? (
                <img className="companion-coach__photo" src={pendingPhoto} alt="Dough photo shared with coach" />
              ) : null}
              <p>{pendingQuestionText}</p>
            </article>
          ) : null}
          {isSending ? <p className="companion-coach__typing">Coach is thinking…</p> : null}
        </div>

        {failure ? (
          <div className="companion-coach__failure" role="alert">
            <p>{failure.message}</p>
            {isRetryableCoachFailure(failure.reason) ? (
              <button
                type="button"
                className="wizard-button wizard-button--secondary companion-coach__retry"
                disabled={isSending}
                onClick={() => void sendQuestion()}
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}

        {isPreparingPhoto ? <p className="companion-coach__photo-status">Preparing photo…</p> : null}

        {photoError ? (
          <p className="companion-coach__photo-error" role="alert">
            {photoError}
          </p>
        ) : null}

        {pendingPhoto && !isSending ? (
          <div className="companion-coach__pending-photo">
            <img src={pendingPhoto} alt="Photo ready to send" />
            <button type="button" className="companion-coach__remove-photo" onClick={() => {
              setPendingPhoto(null);
              setPhotoError(null);
            }}>
              Remove photo
            </button>
          </div>
        ) : null}

        {canAskQuestion && !isSending ? (
          <ul className="companion-coach__chips" aria-label="Suggested questions">
            {quickQuestions.map((question) => (
              <li key={question}>
                <button
                  type="button"
                  className="companion-coach__chip"
                  onClick={() => handleQuickQuestion(question)}
                >
                  {question}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {canAskQuestion ? (
          <form className="companion-coach__composer" onSubmit={(event) => void handleSubmit(event)}>
            <div className="companion-coach__photo-input">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="visually-hidden"
                onChange={(event) => void handlePhotoChange(event)}
              />
              <button
                type="button"
                className="wizard-icon-button wizard-icon-button--help companion-coach__photo-button"
                aria-label="Add photo"
                disabled={isPreparingPhoto || isSending}
                onClick={() => photoInputRef.current?.click()}
              >
                <CameraIcon />
              </button>
            </div>
            <label className="companion-coach__text-input" htmlFor={inputId}>
              <span className="visually-hidden">Ask the coach</span>
              <input
                ref={textInputRef}
                id={inputId}
                type="text"
                value={draft}
                placeholder="Ask about this step…"
                readOnly={isSending}
                onChange={(event) => {
                  setDraft(event.currentTarget.value);
                  setFailure(null);
                }}
              />
            </label>
            <button type="submit" className="wizard-button wizard-button--primary companion-coach__send" disabled={isSending || isPreparingPhoto}>
              Send
            </button>
          </form>
        ) : (
          <p className="companion-coach__limit" role="status">
            {getCoachFailureMessage('limit')}
          </p>
        )}
      </section>
    </div>
  );
}

function SavedCoachMessage({
  message,
  showStepNote,
}: {
  message: CoachTranscriptMessage;
  showStepNote: boolean;
}) {
  return (
    <article
      className={
        message.role === 'assistant'
          ? 'companion-coach__message companion-coach__message--assistant'
          : 'companion-coach__message companion-coach__message--user'
      }
    >
      {showStepNote ? <p className="companion-coach__step-note">At: {message.stepLabel}</p> : null}
      {message.hadPhoto ? <p className="companion-coach__step-note">Photo shared</p> : null}
      <p>{message.text}</p>
    </article>
  );
}

/** Label a question with its step only when the baker has moved on since the previous one. */
function shouldShowStepNote(message: CoachTranscriptMessage, lastShownStepId: string): boolean {
  return message.role === 'user' && message.stepId !== lastShownStepId;
}

function tryBuildLiveContext(session: BakeSession) {
  try {
    // Plan without drift, so "planned" means the original plan; drift is reported separately.
    const plannedTimeline = formatTimelineForDisplay(
      buildTimeline(session.scheduleInput, session.recipeInput),
    );
    return buildCoachLiveContext(session, plannedTimeline);
  } catch (error) {
    console.warn('[coach] could not build live bake context:', error);
    return null;
  }
}
