import { HomeIcon } from './icons.tsx';

type AppHeaderProps = {
  onHome: () => void;
  title?: string;
};

export function AppHeader({ onHome, title }: AppHeaderProps) {
  return (
    <header className={title ? 'app-header' : 'app-header app-header--home-only'}>
      {title ? <h1 className="app-header__title">{title}</h1> : null}
      <button type="button" className="app-header__home wizard-icon-button" onClick={onHome}>
        <HomeIcon />
        <span className="visually-hidden">Home</span>
      </button>
    </header>
  );
}
