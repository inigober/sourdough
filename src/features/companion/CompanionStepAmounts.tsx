import { useId, useState } from 'react';

import { formatGrams } from '../../app/format.ts';
import { ChevronDownIcon } from '../../components/icons.tsx';
import type { StepAmounts } from '../../lib/companion/stepAmounts.ts';

type CompanionStepAmountsProps = {
  amounts: StepAmounts;
};

/**
 * Gram amounts for the current step, collapsed until the baker asks. The parent gives this a
 * `key` per step, so it starts collapsed again on every new step.
 */
export function CompanionStepAmounts({ amounts }: CompanionStepAmountsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="companion-amounts">
      <button
        type="button"
        className="companion-amounts__toggle"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>Amounts</span>
        <span
          className={`companion-amounts__chevron${isOpen ? ' companion-amounts__chevron--open' : ''}`}
        >
          <ChevronDownIcon />
        </span>
      </button>
      {isOpen ? (
        <div id={panelId} className="companion-amounts__panel">
          <dl className="companion-amounts__list">
            {amounts.rows.map((row) => (
              <div
                key={row.label}
                className={`companion-amounts__row${row.isTotal ? ' companion-amounts__row--total' : ''}`}
              >
                <dt>{row.label}</dt>
                <dd>{formatGrams(row.grams)}</dd>
              </div>
            ))}
          </dl>
          {amounts.note ? <p className="companion-amounts__note">{amounts.note}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
