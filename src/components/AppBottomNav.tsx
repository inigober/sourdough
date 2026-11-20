import { BookmarkIcon, ClockIcon, HomeIcon } from './icons.tsx';

export type AppMainTab = 'home' | 'saved' | 'history';

type AppBottomNavProps = {
  activeTab: AppMainTab;
  onTabChange: (tab: AppMainTab) => void;
  onDevUnlockTap?: () => void;
};

const NAV_ITEMS = [
  { tab: 'home', label: 'Home', Icon: HomeIcon },
  { tab: 'saved', label: 'Saved', Icon: BookmarkIcon },
  { tab: 'history', label: 'History', Icon: ClockIcon },
] as const;

export function AppBottomNav({ activeTab, onTabChange, onDevUnlockTap }: AppBottomNavProps) {
  function handleClick(tab: AppMainTab): void {
    // Tapping Home while already on Home is the hidden dev-panel unlock gesture.
    if (tab === 'home' && activeTab === 'home') {
      onDevUnlockTap?.();
      return;
    }

    onTabChange(tab);
  }

  return (
    <nav className="app-bottom-nav" aria-label="Main navigation">
      {NAV_ITEMS.map(({ tab, label, Icon }) => (
        <button
          key={tab}
          type="button"
          className={activeTab === tab ? 'app-bottom-nav__item app-bottom-nav__item--active' : 'app-bottom-nav__item'}
          aria-current={activeTab === tab ? 'page' : undefined}
          onClick={() => handleClick(tab)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
