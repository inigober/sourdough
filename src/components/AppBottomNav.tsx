import { ClockIcon, HomeIcon } from './icons.tsx';

export type AppMainTab = 'home' | 'history';

type AppBottomNavProps = {
  activeTab: AppMainTab;
  onTabChange: (tab: AppMainTab) => void;
};

export function AppBottomNav({ activeTab, onTabChange }: AppBottomNavProps) {
  return (
    <nav className="app-bottom-nav" aria-label="Main navigation">
      <button
        type="button"
        className={activeTab === 'home' ? 'app-bottom-nav__item app-bottom-nav__item--active' : 'app-bottom-nav__item'}
        aria-current={activeTab === 'home' ? 'page' : undefined}
        onClick={() => onTabChange('home')}
      >
        <HomeIcon />
        <span>Home</span>
      </button>
      <button
        type="button"
        className={
          activeTab === 'history' ? 'app-bottom-nav__item app-bottom-nav__item--active' : 'app-bottom-nav__item'
        }
        aria-current={activeTab === 'history' ? 'page' : undefined}
        onClick={() => onTabChange('history')}
      >
        <ClockIcon />
        <span>History</span>
      </button>
    </nav>
  );
}
