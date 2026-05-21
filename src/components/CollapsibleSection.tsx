import { useId, useState, type ReactNode } from 'react';

type CollapsibleSectionProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function CollapsibleSection({ title, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className="card collapsible-section">
      <button
        type="button"
        className="collapsible-section__trigger"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{title}</span>
        <span className="collapsible-section__chevron" aria-hidden="true">
          {isOpen ? '−' : '+'}
        </span>
      </button>
      {isOpen ? (
        <div id={panelId} className="collapsible-section__panel">
          {children}
        </div>
      ) : null}
    </section>
  );
}
