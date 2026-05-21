import { PenIcon } from './icons.tsx';

type PenEditButtonProps = {
  label: string;
  onClick: () => void;
  className?: string;
};

export function PenEditButton({ label, onClick, className }: PenEditButtonProps) {
  const classes = ['wizard-icon-button', 'wizard-icon-button--accent', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} aria-label={label} onClick={onClick}>
      <PenIcon />
    </button>
  );
}
