import { PenIcon } from './icons.tsx';

type PenEditButtonProps = {
  label: string;
  onClick: () => void;
  className?: string;
};

export function PenEditButton({ label, onClick, className }: PenEditButtonProps) {
  return (
    <button
      type="button"
      className={className ? `pen-edit-button ${className}` : 'pen-edit-button'}
      aria-label={label}
      onClick={onClick}
    >
      <PenIcon />
    </button>
  );
}
