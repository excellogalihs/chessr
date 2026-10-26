import type { ReactNode } from 'react';

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

function Icon({
  children,
  size = 18,
  className,
  strokeWidth = 1.8,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
  </Icon>
);

export const IconTarget = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" />
  </Icon>
);

export const IconFlame = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12.5 3c.4 3.3-2.1 4.4-3.4 6.4-1 1.6-.9 3.1.3 4.2-.1-1.8 1.1-3 2.5-3.9.1 2.1 1.5 3 2.5 4.4.8 1.1.9 2.3.4 3.4 2-.8 3.7-2.6 3.7-5.5 0-3.3-1.9-6-4.3-7.9-.4 1.1-.8 1.8-1.7 2.4.4-1.2.5-2.5 0-3.5Z" />
    <path d="M8 18.2c.6 1.7 2.1 2.8 4.2 2.8 2.4 0 4-1.4 4-3.3 0-1.2-.5-2.1-1.3-3" />
  </Icon>
);

export const IconClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.2 2" />
  </Icon>
);

export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 5 7 7-7 7" />
  </Icon>
);

export const IconChevronLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="m15 5-7 7 7 7" />
  </Icon>
);

export const IconChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 9 7 7 7-7" />
  </Icon>
);

export const IconArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12h16" />
    <path d="m14 6 6 6-6 6" />
  </Icon>
);

export const IconArrowLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 12H4" />
    <path d="m10 6-6 6 6 6" />
  </Icon>
);

export const IconArrowUpRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 17 17 7" />
    <path d="M8 7h9v9" />
  </Icon>
);

export const IconUpload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </Icon>
);

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const IconPlay = (p: IconProps) => (
  <Icon {...p}>
    <path d="m7 4 13 8-13 8V4Z" fill="currentColor" stroke="none" />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="m4.5 12.5 5 5L20 6.5" />
  </Icon>
);

export const IconX = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const IconLightbulb = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 18h6" />
    <path d="M10 21h4" />
    <path d="M8.2 14.6A6 6 0 1 1 15.8 14.6c-.7.6-1.1 1.3-1.2 2.4h-5.2c-.1-1.1-.5-1.8-1.2-2.4Z" />
  </Icon>
);

export const IconEye = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.7" />
  </Icon>
);

export const IconRotate = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3 8.5" />
    <path d="M3 3.5v5h5" />
  </Icon>
);

export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16" />
    <path d="M9.5 7V4.5h5V7" />
    <path d="M6 7l1 13h10l1-13" />
    <path d="M10 11v5M14 11v5" />
  </Icon>
);

export const IconVolume = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9.5h3L12 5v14l-5-4.5H4v-5Z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.2 6a8.5 8.5 0 0 1 0 12" />
  </Icon>
);

export const IconVolumeOff = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9.5h3L12 5v14l-5-4.5H4v-5Z" />
    <path d="m16 9 5 6M21 9l-5 6" />
  </Icon>
);

export const IconFlip = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 3H4v4" />
    <path d="M4 7a9 9 0 0 1 15.5-2" />
    <path d="M16 21h4v-4" />
    <path d="M20 17A9 9 0 0 1 4.5 19" />
  </Icon>
);

export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Icon>
);

export const IconBook = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22V4.5Z" />
    <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" />
  </Icon>
);

export const IconSparkles = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" />
    <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
    <path d="M5 15l.6 1.4L7 17l-1.4.6L5 19l-.6-1.4L3 17l1.4-.6L5 15Z" />
  </Icon>
);

export const IconTrophy = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 21h8" />
    <path d="M12 17v4" />
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
  </Icon>
);

export const IconTrendUp = (p: IconProps) => (
  <Icon {...p}>
    <path d="m3 17 6-6 4 4 7-8" />
    <path d="M15 7h5v5" />
  </Icon>
);

export const IconLayers = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 12 9 5 9-5" />
    <path d="m3 16 9 5 9-5" />
  </Icon>
);

export const IconCalendar = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M8 3v4M16 3v4M3 10h18" />
  </Icon>
);

export const IconZap = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 2 4.5 13H11l-1 9 9-12h-6.5L13 2Z" />
  </Icon>
);

export const IconMore = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="5" cy="12" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="19" cy="12" r="1" fill="currentColor" />
  </Icon>
);

export const IconCopy = (p: IconProps) => (
  <Icon {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </Icon>
);

export const IconInfo = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <circle cx="12" cy="7.5" r="0.9" fill="currentColor" stroke="none" />
  </Icon>
);

export const IconSwords = (p: IconProps) => (
  <Icon {...p}>
    <path d="m14.5 4.5 5-1.5-1.5 5L7 19l-3 1 1-3L16.5 5.5" />
    <path d="m5 4.5 14.5 14.5 1 3-3-1L3 6.5l-.5-2.5 2.5.5Z" />
  </Icon>
);

export const IconMenu = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const IconPause = (p: IconProps) => (
  <Icon {...p}>
    <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
  </Icon>
);
