import type { ReactElement } from 'react';

export type MotifName =
  | 'wreath'
  | 'candle'
  | 'star'
  | 'gift'
  | 'tree'
  | 'bell'
  | 'snowflake'
  | 'stocking'
  | 'bauble'
  | 'candycane';

export const MOTIF_NAMES: readonly MotifName[] = [
  'wreath', 'candle', 'star', 'gift', 'tree',
  'bell', 'snowflake', 'stocking', 'bauble', 'candycane',
];

const ink = 'var(--motif-ink)';
const accent = 'var(--motif-accent)';
const hi = 'var(--motif-hi)';

const SHAPES: Record<MotifName, ReactElement> = {
  wreath: (
    <>
      <circle cx="50" cy="52" r="30" fill="none" stroke={ink} strokeWidth="12" />
      <circle cx="50" cy="52" r="30" fill="none" stroke={hi} strokeWidth="3" />
      <path d="M50 14l7 12h-14z" fill={accent} />
      <circle cx="38" cy="40" r="3" fill={accent} />
      <circle cx="64" cy="46" r="3" fill={accent} />
      <circle cx="46" cy="72" r="3" fill={accent} />
    </>
  ),
  candle: (
    <>
      <rect x="42" y="34" width="16" height="48" rx="3" fill={ink} />
      <rect x="42" y="34" width="5" height="48" fill={hi} />
      <rect x="34" y="80" width="32" height="8" rx="3" fill={accent} />
      <path d="M50 16c6 6 6 12 0 18-6-6-6-12 0-18z" fill={accent} />
      <path d="M50 20c3 4 3 8 0 12-3-4-3-8 0-12z" fill={hi} />
    </>
  ),
  star: (
    <>
      <path d="M50 12l11 24 26 3-19 18 5 26-23-13-23 13 5-26-19-18 26-3z" fill={ink} />
      <path d="M50 24l7 15 16 2-12 11 3 16-14-8v-36z" fill={hi} opacity="0.6" />
      <circle cx="50" cy="46" r="6" fill={accent} />
    </>
  ),
  gift: (
    <>
      <rect x="20" y="40" width="60" height="44" rx="4" fill={ink} />
      <rect x="20" y="40" width="60" height="12" fill={hi} opacity="0.5" />
      <rect x="44" y="40" width="12" height="44" fill={accent} />
      <path d="M50 40c-10-14-26-8-20 2 4 6 14 4 20-2zm0 0c10-14 26-8 20 2-4 6-14 4-20-2z" fill={accent} />
    </>
  ),
  tree: (
    <>
      <path d="M50 14l20 30H30zM50 34l24 34H26zM50 54l28 34H22z" fill={ink} />
      <rect x="44" y="84" width="12" height="10" fill={accent} />
      <circle cx="50" cy="18" r="4" fill={accent} />
      <path d="M50 14l20 30H50z" fill={hi} opacity="0.35" />
    </>
  ),
  bell: (
    <>
      <path d="M50 20c14 0 22 12 22 30 0 8 3 12 6 16H22c3-4 6-8 6-16 0-18 8-30 22-30z" fill={ink} />
      <path d="M50 20c-8 0-14 5-18 14 4 4 10 6 18 6z" fill={hi} opacity="0.5" />
      <circle cx="50" cy="82" r="6" fill={accent} />
      <rect x="47" y="12" width="6" height="10" rx="3" fill={accent} />
    </>
  ),
  snowflake: (
    <>
      <g stroke={ink} strokeWidth="6" strokeLinecap="round">
        <path d="M50 14v72M20 32l60 36M80 32L20 68" />
      </g>
      <g stroke={accent} strokeWidth="6" strokeLinecap="round">
        <path d="M50 24l-8 8M50 24l8 8M50 76l-8-8M50 76l8-8" />
      </g>
      <circle cx="50" cy="50" r="6" fill={hi} />
    </>
  ),
  stocking: (
    <>
      <path d="M40 20h24v34c0 6 4 8 10 12l8 6c6 4 4 14-4 14H40c-6 0-8-4-8-10z" fill={ink} />
      <path d="M40 20h24v10H40z" fill={accent} />
      <path d="M40 30h24v6H40z" fill={hi} opacity="0.5" />
      <circle cx="70" cy="86" r="4" fill={accent} />
    </>
  ),
  bauble: (
    <>
      <circle cx="50" cy="56" r="30" fill={ink} />
      <path d="M50 26a30 30 0 0 0-21 51z" fill={hi} opacity="0.4" />
      <rect x="44" y="14" width="12" height="12" rx="2" fill={accent} />
      <path d="M28 50h44M32 66h36" stroke={accent} strokeWidth="4" />
    </>
  ),
  candycane: (
    <>
      <path d="M40 84V44a18 18 0 0 1 36 0v6" fill="none" stroke={ink} strokeWidth="14" strokeLinecap="round" />
      <path d="M40 84V44a18 18 0 0 1 36 0v6" fill="none" stroke={accent} strokeWidth="14" strokeLinecap="round" strokeDasharray="8 10" />
      <path d="M40 84V44a18 18 0 0 1 12-17" fill="none" stroke={hi} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
};

export interface MotifProps {
  name: MotifName;
  title?: string;
  className?: string;
}

export function Motif({ name, title, className }: MotifProps): ReactElement | null {
  const shape = SHAPES[name];
  if (!shape) return null;
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {shape}
    </svg>
  );
}
