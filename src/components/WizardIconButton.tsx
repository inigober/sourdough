import { ArrowLeftIcon, ArrowRightIcon } from './icons.tsx';

type WizardIconButtonProps = {
  label: string;
  direction: 'back' | 'forward';
  variant?: 'default' | 'primary';
  disabled?: boolean;
  onClick: () => void;
};

export function WizardIconButton({
  label,
  direction,
  variant = 'default',
  disabled = false,
  onClick,
}: WizardIconButtonProps) {
  return (
    <button
      type="button"
      className={
        variant === 'primary'
          ? 'wizard-icon-button wizard-icon-button--primary'
          : 'wizard-icon-button'
      }
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {direction === 'back' ? <ArrowLeftIcon /> : <ArrowRightIcon />}
    </button>
  );
}
