import { HomeIcon } from './icons.tsx';

type AppHeaderProps = {
  onHome: () => void;
};

export function AppHeader({ onHome }: AppHeaderProps) {
  return (
    <header className="app-header">
      <button type="button" className="app-header__home wizard-icon-button" onClick={onHome}>
        <HomeIcon />
        <span className="visually-hidden">Home</span>
      </button>
    </header>
  );
}
