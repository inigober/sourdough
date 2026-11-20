import { ScreenChrome } from './ScreenChrome.tsx';
import { HomeIcon } from './icons.tsx';

type AppHeaderProps = {
  onHome: () => void;
  title?: string;
};

export function AppHeader({ onHome, title }: AppHeaderProps) {
  return (
    <ScreenChrome
      title={title}
      trailing={
        <button type="button" className="icon-button" onClick={onHome}>
          <HomeIcon />
          <span className="visually-hidden">Home</span>
        </button>
      }
    />
  );
}
