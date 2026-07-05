import type { ReactNode } from 'react';

type ScreenChromeProps = {
  title?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function ScreenChrome({ title, leading, trailing }: ScreenChromeProps) {
  const layoutClass =
    !title && trailing
      ? 'screen-chrome screen-chrome--trailing-only'
      : title && !leading && !trailing
        ? 'screen-chrome screen-chrome--title-only'
        : 'screen-chrome';

  return (
    <header className={layoutClass}>
      {leading ? <div className="screen-chrome__slot screen-chrome__slot--leading">{leading}</div> : null}
      {title ? <h1 className="screen-chrome__title">{title}</h1> : null}
      {trailing ? <div className="screen-chrome__slot screen-chrome__slot--trailing">{trailing}</div> : null}
    </header>
  );
}
