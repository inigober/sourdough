import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { compressCoachPhoto, getCoachPhotoCompressionOptions } from '../../lib/companion/compressCoachPhoto.ts';
import { buildCoachPrompt } from '../../lib/companion/buildCoachPrompt.ts';
import { getCoachTipForStep } from '../../lib/companion/coachStepTips.ts';
import type { CoachTopic } from '../../lib/companion/coachTopics.ts';
import {
  canAskCoachQuestion,
  coachQuestionLimitMessage,
  formatCoachQuestionsRemaining,
} from '../../lib/companion/coachLimits.ts';
import { incrementCoachQuestionsAsked } from '../../lib/companion/bakeSession.ts';
import { requestCoachReply } from '../../lib/companion/requestCoachReply.ts';
import type { BakeSession } from '../../lib/companion/types.ts';
import { CameraIcon, CloseIcon } from '../../components/icons.tsx';

type CoachMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  imageUrl?: string;
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
  const [messages, setMessages] = useState<CoachMessage[]>(() => [
    {
      id: 'intro',
      role: 'assistant',
      text: getCoachTipForStep(stepId, stepLabel, session.recipeInput),
    },
  ]);
  const [draft, setDraft] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const canAskQuestion = canAskCoachQuestion(session.coachQuestionsAsked);
  const questionsRemainingLabel = formatCoachQuestionsRemaining(session.coachQuestionsAsked);

  useEffect(() => {
    setMessages([
      {
        id: 'intro',
        role: 'assistant',
        text: getCoachTipForStep(stepId, stepLabel, session.recipeInput),
      },
    ]);
    setDraft('');
    setPendingPhoto(null);
    setPhotoError(null);
    setIsPreparingPhoto(false);
  }, [stepId, stepLabel, session.recipeInput]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const question = draft.trim();
    if (!question && !pendingPhoto) {
      return;
    }

    if (!canAskQuestion) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: coachQuestionLimitMessage(),
        },
      ]);
      return;
    }

    const userMessage: CoachMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: question || 'What can you tell me from this photo?',
      imageUrl: pendingPhoto ?? undefined,
    };

    setMessages((current) => [...current, userMessage]);
    setDraft('');
    setPendingPhoto(null);
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
        userQuestion: userMessage.text,
        hasPhoto: Boolean(userMessage.imageUrl),
      });

      const result = await requestCoachReply({
        ...prompt,
        photoDataUrl: userMessage.imageUrl,
        coachQuestionsAsked: session.coachQuestionsAsked,
      });

      if (result.ok) {
        onSessionChange(incrementCoachQuestionsAsked(session));
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: result.ok ? result.reply : result.message,
        },
      ]);
    } finally {
      setIsSending(false);
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

  return (
    <div className="companion-coach" role="dialog" aria-modal="true" aria-labelledby="companion-coach-title">
      <div className="companion-coach__backdrop" onClick={onClose} aria-hidden="true" />
      <section className="companion-coach__panel">
        <header className="companion-coach__header">
          <div>
            <h2 id="companion-coach-title">Baking coach</h2>
            <p className="companion-coach__subtitle">{stepLabel}</p>
            <p className="companion-coach__quota">{questionsRemainingLabel}</p>
          </div>
          <button type="button" className="wizard-icon-button companion-coach__close" aria-label="Close coach" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <div className="companion-coach__transcript" ref={transcriptRef}>
          {messages.map((message) => (
            <article
              key={message.id}
              className={
                message.role === 'assistant'
                  ? 'companion-coach__message companion-coach__message--assistant'
                  : 'companion-coach__message companion-coach__message--user'
              }
            >
              {message.imageUrl ? (
                <img className="companion-coach__photo" src={message.imageUrl} alt="Dough photo shared with coach" />
              ) : null}
              <p>{message.text}</p>
            </article>
          ))}
          {isSending ? <p className="companion-coach__typing">Coach is thinking…</p> : null}
        </div>

        {isPreparingPhoto ? <p className="companion-coach__photo-status">Preparing photo…</p> : null}

        {photoError ? (
          <p className="companion-coach__photo-error" role="alert">
            {photoError}
          </p>
        ) : null}

        {pendingPhoto ? (
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
                id={inputId}
                type="text"
                value={draft}
                placeholder="Ask about this step…"
                onChange={(event) => setDraft(event.currentTarget.value)}
              />
            </label>
            <button type="submit" className="wizard-button wizard-button--primary companion-coach__send" disabled={isSending || isPreparingPhoto}>
              Send
            </button>
          </form>
        ) : (
          <p className="companion-coach__limit" role="status">
            {coachQuestionLimitMessage()}
          </p>
        )}
      </section>
    </div>
  );
}
