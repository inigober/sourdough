import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

const PAGE_MARGIN_PX = 20;

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
    const maxLeft = window.innerWidth - PAGE_MARGIN_PX - bubbleWidth;
    const left = Math.min(Math.max(buttonRect.left, PAGE_MARGIN_PX), Math.max(PAGE_MARGIN_PX, maxLeft));
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
      const maxLeft = window.innerWidth - PAGE_MARGIN_PX - bubbleWidth;
      const left = Math.min(Math.max(buttonRect.left, PAGE_MARGIN_PX), Math.max(PAGE_MARGIN_PX, maxLeft));

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
        className="info-toggle__button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="visually-hidden">Info about {label}</span>
        <span aria-hidden="true">i</span>
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
