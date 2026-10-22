import { useId } from "react";

interface BrandMarkProps {
  size?: number;
  className?: string;
}

/**
 * The Bo do it logo: a honey tile holding a planner page, a done tick and a
 * small heart. Keep in step with app/icon.svg.
 */
export function BrandMark({ size = 36, className = "" }: BrandMarkProps) {
  // Gradient ids must be unique when the mark appears more than once.
  const id = useId();
  const bg = `${id}-bg`;
  const page = `${id}-page`;
  return (
    <svg
      className={`brand-mark ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={bg} x1="6" y1="2" x2="58" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8DE8E" />
          <stop offset="1" stopColor="#DFA73E" />
        </linearGradient>
        <linearGradient id={page} x1="32" y1="16" x2="32" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFEF8" />
          <stop offset="1" stopColor="#FFF4D6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="18" fill={`url(#${bg})`} />
      <rect x="13" y="18.5" width="38" height="35" rx="9" fill="#9C6B1A" fillOpacity=".22" />
      <rect x="13" y="16" width="38" height="35" rx="9" fill={`url(#${page})`} />
      <path d="M13 25C13 20 17 16 22 16H42C47 16 51 20 51 25Z" fill="#F4C960" />
      <rect x="21" y="11" width="5" height="10" rx="2.5" fill="#6E4A10" />
      <rect x="38" y="11" width="5" height="10" rx="2.5" fill="#6E4A10" />
      <path
        d="M22.5 37L29 43L41.5 30.5"
        stroke="#6E4A10"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M44.5 42.2C44.5 39.4 48.2 38.1 49.9 40.5C51.6 38.1 55.3 39.4 55.3 42.2C55.3 45.6 49.9 49 49.9 49C49.9 49 44.5 45.6 44.5 42.2Z"
        fill="#E8788C"
        stroke="#FFFEF8"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
