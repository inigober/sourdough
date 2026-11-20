import { ArrowLeftIcon } from './icons.tsx';

type ChromeBackButtonProps = {
  label: string;
  onClick: () => void;
};

export function ChromeBackButton({ label, onClick }: ChromeBackButtonProps) {
  return (
    <button type="button" className="icon-button" aria-label={label} onClick={onClick}>
      <ArrowLeftIcon />
    </button>
  );
}
