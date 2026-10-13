import type { ReactNode } from "react";

export type EmptyArt = "tea" | "calendar" | "notes" | "search" | "tags";

interface EmptyStateProps {
  art: EmptyArt;
  title: string;
  description?: ReactNode;
  /** Usually one button that fixes the emptiness, e.g. "Thêm công việc". */
  action?: ReactNode;
  /** Smaller art and type, for narrow panels. */
  compact?: boolean;
  className?: string;
}

/**
 * A calm placeholder for an empty list: a small drawing, one line saying what
 * is (not) here, and a way forward. The art is drawn with --art-* tokens, so it
 * follows the light and dark themes.
 */
export function EmptyState({
  art,
  title,
  description,
  action,
  compact = false,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`empty-state ${compact ? "is-compact" : ""} ${className}`}>
      <svg
        className="empty-state-art"
        viewBox="0 0 120 96"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse cx="60" cy="86" rx="40" ry="5" fill="var(--art-soft)" />
        {artwork[art]}
      </svg>
      <p className="empty-state-title">{title}</p>
      {description ? <p className="empty-state-description">{description}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}

const stroke = {
  fill: "none",
  stroke: "var(--art-line)",
  strokeWidth: 3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const artwork: Record<EmptyArt, ReactNode> = {
  // A cup of tea: nothing planned, time to breathe.
  tea: (
    <>
      <path d="M50 22c-4 5 4 8 0 13M62 18c-4 5 4 8 0 13M74 22c-4 5 4 8 0 13" {...stroke} strokeWidth={2.5} />
      <path d="M36 44h52v14c0 14-11 24-26 24S36 72 36 58z" {...stroke} fill="var(--art-paper)" />
      <path d="M88 50h4a8 8 0 0 1 0 16h-6" {...stroke} />
      <path d="M44 56c5 3 31 3 36 0" stroke="var(--art-accent)" strokeWidth={3} strokeLinecap="round" fill="none" />
      <path d="M24 82c0-9 6-14 12-15-1 7-5 12-12 15z" fill="var(--art-leaf)" />
    </>
  ),
  // A calendar page with a sun peeking over it.
  calendar: (
    <>
      <circle cx="86" cy="24" r="10" fill="var(--art-accent)" opacity={0.85} />
      <rect x="30" y="26" width="56" height="54" rx="9" {...stroke} fill="var(--art-paper)" />
      <path d="M30 40h56" {...stroke} />
      <path d="M44 20v12M72 20v12" {...stroke} />
      <circle cx="45" cy="54" r="3" fill="var(--art-line)" />
      <circle cx="58" cy="54" r="3" fill="var(--art-line)" />
      <circle cx="71" cy="54" r="3" fill="var(--art-accent)" />
      <circle cx="45" cy="67" r="3" fill="var(--art-line)" />
      <circle cx="58" cy="67" r="3" fill="var(--art-line)" />
    </>
  ),
  // A blank checklist sheet and a pencil.
  notes: (
    <>
      <rect x="32" y="16" width="48" height="64" rx="8" {...stroke} fill="var(--art-paper)" />
      <path d="M42 34h4M52 34h18M42 48h4M52 48h18M42 62h4M52 62h12" {...stroke} strokeWidth={2.5} />
      <path d="M78 74l16-34 7 3-16 34-8 4z" fill="var(--art-accent)" stroke="var(--art-line)" strokeWidth={2} strokeLinejoin="round" />
    </>
  ),
  // A magnifying glass over a faint line.
  search: (
    <>
      <path d="M26 72h30" {...stroke} strokeWidth={2.5} opacity={0.6} />
      <circle cx="56" cy="44" r="20" {...stroke} fill="var(--art-paper)" />
      <path d="M48 38a10 10 0 0 1 10-6" stroke="var(--art-accent)" strokeWidth={3} strokeLinecap="round" fill="none" />
      <path d="M71 59l15 15" {...stroke} strokeWidth={6} />
    </>
  ),
  // A luggage-style tag on its string.
  tags: (
    <>
      <path d="M34 30h34l20 22-20 22H34a6 6 0 0 1-6-6V36a6 6 0 0 1 6-6z" {...stroke} fill="var(--art-paper)" />
      <circle cx="70" cy="52" r="4" fill="var(--art-accent)" />
      <path d="M74 52c10 0 18-8 22-20" {...stroke} strokeWidth={2.5} />
      <path d="M40 46h16M40 58h10" {...stroke} strokeWidth={2.5} />
    </>
  ),
};
