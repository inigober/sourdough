import type { ReactNode, SVGProps } from 'react';

type IconProps = {
  className?: string;
};

type IconPathProps = IconProps & {
  children: ReactNode;
};

function Icon({ className, children }: IconPathProps) {
  return (
    <svg
      className={className ?? 'icon'}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as SVGProps<SVGPathElement>['strokeLinecap'],
  strokeLinejoin: 'round' as SVGProps<SVGPathElement>['strokeLinejoin'],
};

export function PenIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path
        d="M13.25 4.75 15.25 6.75 7.25 14.75 4.75 15.25 5.25 12.75 13.25 4.75"
        {...stroke}
        strokeWidth={1.35}
      />
    </Icon>
  );
}

export function BinIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M6 6.5h8" {...stroke} strokeWidth={1.35} />
      <path d="M8 6.5V5.75a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6.5" {...stroke} strokeWidth={1.35} />
      <path d="M7 6.5v8.25a.75.75 0 0 0 .75.75h4.5a.75.75 0 0 0 .75-.75V6.5" {...stroke} strokeWidth={1.35} />
      <path d="M9 9v4M11 9v4" {...stroke} strokeWidth={1.35} />
    </Icon>
  );
}

export function ArrowLeftIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12.5 5 7.5 10l5 5" {...stroke} />
    </Icon>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m7.5 5 5 5-5 5" {...stroke} />
    </Icon>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m5 10 3 3 7-7.5" {...stroke} strokeWidth={1.75} />
    </Icon>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M10 5v10M5 10h10" {...stroke} strokeWidth={1.75} />
    </Icon>
  );
}

export function MinusIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M5 10h10" {...stroke} strokeWidth={1.75} />
    </Icon>
  );
}

export function ChevronUpIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m5 12.5 5-5 5 5" {...stroke} />
    </Icon>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m5 7.5 5 5 5-5" {...stroke} />
    </Icon>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m6 6 8 8M14 6l-8 8" {...stroke} strokeWidth={1.75} />
    </Icon>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M2.5 10s3-5.5 7.5-5.5S17.5 10 17.5 10s-3 5.5-7.5 5.5S2.5 10 2.5 10Z" {...stroke} />
      <circle cx="10" cy="10" r="2" {...stroke} />
    </Icon>
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path
        d="M3 3l14 14M7.5 8.5A3.5 3.5 0 0 0 10 13.5c.8 0 1.5-.3 2.1-.7M4.5 5.5C3.2 6.6 2.2 8 2.2 8.2S5.5 14 10 14c1.2 0 2.3-.3 3.3-.8M13.5 11.5c1-1 1.7-1.8 2.3-2.5"
        {...stroke}
      />
    </Icon>
  );
}

export function SaveIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M4 3.5h8.5L16 7v9.5a.5.5 0 0 1-.5.5H4.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z" {...stroke} />
      <path d="M6.5 3.5V7h5.5M6.5 13h7" {...stroke} />
    </Icon>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M3.5 8.5 10 3.5l6.5 5V16a1 1 0 0 1-1 1h-3.5v-4.5H8V17H4.5a1 1 0 0 1-1-1V8.5Z" {...stroke} />
    </Icon>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="10" cy="7" r="3" {...stroke} />
      <path d="M4.5 16.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" {...stroke} />
    </Icon>
  );
}

export function RestartIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path
        d="M16.5 7.25A6.25 6.25 0 1 0 7.75 14.75"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M16.5 4.25v3.5H13"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Icon>
  );
}

export function HelpIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="10" cy="10" r="6.5" {...stroke} />
      <path d="M8 8.2c.2-1.2 1.1-2 2.2-2 1.3 0 2.2.8 2.2 2 0 1.5-2.2 1.6-2.2 3.2" {...stroke} />
      <circle cx="10" cy="14.2" r="0.75" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function SparklesIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path
        d="M10 5.25 10.6 7.8 13.15 8.4 10.6 9 10 11.55 9.4 9 6.85 8.4 9.4 7.8Z"
        {...stroke}
        strokeWidth={1.35}
      />
      <path d="M14.75 6.25h.9M15.2 5.8v.9" {...stroke} strokeWidth={1.5} />
      <path d="M5.05 14.1h.9M5.5 13.65v.9" {...stroke} strokeWidth={1.5} />
    </Icon>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="10" cy="10" r="6.5" {...stroke} />
      <path d="M10 9v5M10 6.5v.5" {...stroke} strokeWidth={1.75} />
    </Icon>
  );
}

export function ScaleIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M10 4v12M6 8h8M7 8l-2 4h4L7 8ZM13 8l-2 4h4l-2-4Z" {...stroke} />
    </Icon>
  );
}

export function WheatIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M10 17V7M10 7c-1.5-2-3.5-2.5-5-2M10 7c1.5-2 3.5-2.5 5-2M10 10c-1.2-1.5-2.8-2-4-2M10 10c1.2-1.5 2.8-2 4-2M10 13c-1-1.2-2.2-1.6-3.2-1.6M10 13c1-1.2 2.2-1.6 3.2-1.6" {...stroke} />
    </Icon>
  );
}

export function WaterIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path
        d="M10 4.5c2.5 3.5 4.5 6 4.5 8.2A4.5 4.5 0 1 1 5.5 12.7c0-2.2 2-4.7 4.5-8.2Z"
        {...stroke}
      />
    </Icon>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="10" cy="10" r="6.5" {...stroke} />
      <path d="M10 6.5V10l2.5 2.5" {...stroke} />
    </Icon>
  );
}

export function LoafIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path
        d="M5.5 11.5c0-3 2-5.5 4.5-5.5s4.5 2.5 4.5 5.5v2.5a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1v-2.5Z"
        {...stroke}
      />
      <path d="M7.5 9.5h.01M10 8.8h.01M12.5 9.5h.01" {...stroke} strokeWidth={2} />
    </Icon>
  );
}

export function CameraIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M4.5 7h2l1-1.5h5l1 1.5h2a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" {...stroke} />
      <circle cx="10" cy="11.5" r="2.5" {...stroke} />
    </Icon>
  );
}
