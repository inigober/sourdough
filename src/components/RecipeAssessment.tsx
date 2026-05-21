import { InfoToggle } from './InfoToggle.tsx';
import type { AssessmentSection } from '../lib/recipe/types.ts';

type RecipeAssessmentProps = {
  sections: AssessmentSection[];
  isUnavailable: boolean;
  info?: string;
};

export function RecipeAssessment({ sections, isUnavailable, info }: RecipeAssessmentProps) {
  if (isUnavailable) {
    return (
      <section className="card recipe-assessment">
        <h2>Recipe assessment</h2>
        <p>Fix the blocking input errors above to assess this recipe.</p>
      </section>
    );
  }

  return (
    <section className="card recipe-assessment">
      <div className="recipe-assessment__heading">
        <h2>Recipe assessment</h2>
        {info ? <InfoToggle label="Recipe assessment">{info}</InfoToggle> : null}
      </div>
      <ul>
        {sections.map((section) => (
          <li key={section.title} className={`assessment-section assessment-section--${section.level}`}>
            <strong>{section.title}</strong>
            <span>{section.shortMessage}</span>
            <p>{section.details}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
