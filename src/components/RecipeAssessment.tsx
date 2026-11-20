import { useId, useState } from 'react';

import { InfoToggle } from './InfoToggle.tsx';
import { AlertIcon, CheckIcon, ChevronDownIcon, InfoIcon } from './icons.tsx';
import { assessmentLevelLabels, summarizeAssessment } from '../lib/recipe/summarizeAssessment.ts';
import type { AssessmentSection } from '../lib/recipe/types.ts';

type RecipeAssessmentProps = {
  sections: AssessmentSection[];
  isUnavailable: boolean;
  info?: string;
  defaultOpen?: boolean;
};

const levelIcons: Record<AssessmentSection['level'], typeof CheckIcon> = {
  positive: CheckIcon,
  info: InfoIcon,
  warning: AlertIcon,
  risk: AlertIcon,
};

/** One-line verdict first; everything else sits behind a disclosure so the summary stays short. */
export function RecipeAssessment({ sections, isUnavailable, info, defaultOpen = false }: RecipeAssessmentProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const detailsId = useId();
  const summary = summarizeAssessment(sections);

  if (isUnavailable || !summary) {
    return (
      <section className="card recipe-assessment">
        <h2>Recipe assessment</h2>
        <p>Fix the blocking input errors above to assess this recipe.</p>
      </section>
    );
  }

  const { verdict, notes, watchCount } = summary;
  const VerdictIcon = levelIcons[verdict.level];

  return (
    <section className="card recipe-assessment">
      <div className="recipe-assessment__heading">
        <h2>Recipe assessment</h2>
        {info ? <InfoToggle label="Recipe assessment">{info}</InfoToggle> : null}
      </div>

      <p className={`assessment-verdict assessment-verdict--${verdict.level}`}>
        <span className="assessment-verdict__icon" aria-hidden="true">
          <VerdictIcon />
        </span>
        <span className="assessment-verdict__text">
          <span className="assessment-verdict__level">{assessmentLevelLabels[verdict.level]}</span>
          {verdict.shortMessage}
        </span>
      </p>

      <button
        type="button"
        className="assessment-toggle"
        aria-expanded={isOpen}
        aria-controls={isOpen ? detailsId : undefined}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>
          {isOpen ? 'Hide details' : 'Show details'}
          {watchCount > 0 ? ` · ${watchCount} to watch` : ''}
        </span>
        <span
          className={isOpen ? 'assessment-toggle__chevron assessment-toggle__chevron--open' : 'assessment-toggle__chevron'}
          aria-hidden="true"
        >
          <ChevronDownIcon />
        </span>
      </button>

      {isOpen ? (
        <div id={detailsId} className="assessment-details">
          <p className="assessment-details__intro">{verdict.details}</p>
          <ul>
            {notes.map((note) => {
              const NoteIcon = levelIcons[note.level];
              return (
                <li key={note.title} className={`assessment-section assessment-section--${note.level}`}>
                  <strong>
                    <span className="assessment-section__icon" aria-hidden="true">
                      <NoteIcon />
                    </span>
                    {note.title}
                  </strong>
                  <span>{note.shortMessage}</span>
                  <p>{note.details}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
