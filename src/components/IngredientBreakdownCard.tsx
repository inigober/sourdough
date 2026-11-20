import type { ReactNode } from 'react';

import { formatGrams } from '../app/format.ts';
import type {
  FeedingBreakdown,
  IngredientBreakdown,
  IngredientKind,
  IngredientLine,
} from '../lib/recipe/buildIngredientBreakdown.ts';
import { ClockIcon, JarIcon, SaltIcon, WaterIcon, WheatIcon } from './icons.tsx';

type IngredientBreakdownCardProps = {
  breakdown: IngredientBreakdown;
  title?: string;
};

const kindIcons: Record<IngredientKind, ReactNode> = {
  flour: <WheatIcon />,
  water: <WaterIcon />,
  salt: <SaltIcon />,
  levain: <JarIcon />,
  starter: <JarIcon />,
};

/**
 * Ingredients in two clear groups: the levain you build ahead, then what is added to the dough.
 * Every row has the same three columns (icon, name, amount) so the amounts line up.
 */
export function IngredientBreakdownCard({ breakdown, title = 'Ingredients' }: IngredientBreakdownCardProps) {
  const { levain, dough, totals } = breakdown;

  return (
    <section className="card ingredient-breakdown" aria-labelledby="ingredient-breakdown-title">
      <h2 id="ingredient-breakdown-title">{title}</h2>

      <section className="ingredient-section ingredient-section--levain">
        <div className="ingredient-section__header">
          <h3>Levain</h3>
          <p className="ingredient-section__total">
            <strong>{formatGrams(levain.grams)}</strong>
            <span>in the dough</span>
          </p>
        </div>
        <p className="ingredient-section__description">{levain.description}</p>

        {levain.plan ? (
          <>
            {levain.plan.refresh ? (
              <FeedingBlock heading="1. Refresh the starter" feeding={levain.plan.refresh} />
            ) : null}
            <FeedingBlock
              heading={levain.plan.refresh ? '2. Build the levain' : 'Build the levain'}
              feeding={levain.plan.build}
            />
            <p className="ingredient-section__meta">
              <ClockIcon />
              <span>
                About {levain.plan.buildHours} h before mixing. Includes {levain.plan.bufferPercent}% extra for scrape
                and transfer.
              </span>
            </p>
          </>
        ) : null}
      </section>

      <section className="ingredient-section ingredient-section--dough">
        <div className="ingredient-section__header">
          <h3>Added to the dough</h3>
        </div>
        <p className="ingredient-section__description">Weigh these on mix day</p>
        <IngredientRows lines={dough} />
      </section>

      <p className="ingredient-breakdown__totals">
        Totals including the levain: {formatGrams(totals.flourGrams)} flour, {formatGrams(totals.waterGrams)} water.
      </p>
    </section>
  );
}

function FeedingBlock({ heading, feeding }: { heading: string; feeding: FeedingBreakdown }) {
  return (
    <div className="ingredient-feeding">
      <div className="ingredient-feeding__header">
        <h4>{heading}</h4>
        <span className="ingredient-feeding__ratio">
          <span className="visually-hidden">Ratio </span>
          {feeding.ratioLabel}
        </span>
      </div>
      <IngredientRows lines={feeding.lines} total={feeding.totalGrams} />
    </div>
  );
}

function IngredientRows({ lines, total }: { lines: IngredientLine[]; total?: number }) {
  return (
    <dl className="ingredient-rows">
      {lines.map((line) => (
        <div key={`${line.kind}-${line.label}`} className="ingredient-row">
          <dt>
            <span className="ingredient-row__icon" aria-hidden="true">
              {kindIcons[line.kind]}
            </span>
            <span className="ingredient-row__label">
              {line.label}
              {line.note ? <small>{line.note}</small> : null}
            </span>
          </dt>
          <dd>{formatGrams(line.grams)}</dd>
        </div>
      ))}
      {total !== undefined ? (
        <div className="ingredient-row ingredient-row--total">
          <dt>
            <span className="ingredient-row__label">Total</span>
          </dt>
          <dd>{formatGrams(total)}</dd>
        </div>
      ) : null}
    </dl>
  );
}
