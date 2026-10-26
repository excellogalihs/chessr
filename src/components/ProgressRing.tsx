import type { ReactNode } from 'react';

interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClassName?: string;
  children?: ReactNode;
  label?: string;
}

export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  className = '',
  trackClassName = '',
  children,
  label,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={`progress-ring ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(clamped)} percent`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className={`progress-ring-track ${trackClassName}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="progress-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="progress-ring-center">{children ?? <span>{Math.round(clamped)}%</span>}</div>
    </div>
  );
}
