import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { InfoIcon } from './icons.tsx';

const PAGE_MARGIN_DESKTOP_PX = 20;
const PAGE_MARGIN_MOBILE_PX = 14;

function getPageMarginPx(): number {
  if (typeof window === 'undefined') {
    return PAGE_MARGIN_DESKTOP_PX;
  }

  return window.matchMedia('(max-width: 640px)').matches ? PAGE_MARGIN_MOBILE_PX : PAGE_MARGIN_DESKTOP_PX;
}

type InfoToggleProps = {
  label: string;
  children: ReactNode;
};

export function InfoToggle({ label, children }: InfoToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bubbleStyle, setBubbleStyle] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current || !bubbleRef.current) {
      setBubbleStyle(null);
      return;
    }

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const bubbleWidth = bubbleRef.current.offsetWidth;
    const pageMarginPx = getPageMarginPx();
    const maxLeft = window.innerWidth - pageMarginPx - bubbleWidth;
    const left = Math.min(Math.max(buttonRect.left, pageMarginPx), Math.max(pageMarginPx, maxLeft));
    const top = buttonRect.bottom + 8;

    setBubbleStyle({ top, left });
  }, [isOpen, children]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (buttonRef.current?.contains(target) || bubbleRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleResize() {
      if (!buttonRef.current || !bubbleRef.current) {
        return;
      }

      const buttonRect = buttonRef.current.getBoundingClientRect();
      const bubbleWidth = bubbleRef.current.offsetWidth;
      const pageMarginPx = getPageMarginPx();
      const maxLeft = window.innerWidth - pageMarginPx - bubbleWidth;
      const left = Math.min(Math.max(buttonRect.left, pageMarginPx), Math.max(pageMarginPx, maxLeft));

      setBubbleStyle({ top: buttonRect.bottom + 8, left });
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen]);

  return (
    <span className={`info-toggle${isOpen ? ' info-toggle--open' : ''}`}>
      <button
        ref={buttonRef}
        type="button"
        className="wizard-icon-button wizard-icon-button--help info-toggle__button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="visually-hidden">Info about {label}</span>
        <InfoIcon />
      </button>
      {isOpen ? (
        <div
          ref={bubbleRef}
          id={panelId}
          className="info-toggle__bubble"
          role="tooltip"
          style={
            bubbleStyle
              ? { top: `${bubbleStyle.top}px`, left: `${bubbleStyle.left}px` }
              : undefined
          }
        >
          {children}
        </div>
      ) : null}
    </span>
  );
}
