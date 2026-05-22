import { cn } from "@/lib/utils";

type LogoProps = {
  size?: number;
  className?: string;
  /** Show "PayMemo" wordmark next to the mark. Defaults to false (mark-only). */
  withWordmark?: boolean;
  /** When `withWordmark` is true, override the wordmark text. */
  wordmark?: string;
  /** Color of the wordmark. */
  wordmarkClassName?: string;
};

/**
 * PayMemo brand mark (abstract P monogram, no letterform).
 *
 * - Aurora gradient rounded square base
 * - White vertical stem + circle bowl with an ink signet
 * - Neon-green accent pulse in the bottom-right
 *
 * The SVG is fully self-contained (no external defs) so it scales cleanly
 * from 16px favicon up to a hero illustration.
 */
export function Logo({
  size = 32,
  className,
  withWordmark = false,
  wordmark = "PayMemo",
  wordmarkClassName,
}: LogoProps) {
  const mark = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role="img"
      aria-label="PayMemo logo"
      className={cn("shrink-0 drop-shadow-sm", className)}
    >
      <defs>
        <linearGradient id="pm-bg-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A8F139" />
          <stop offset="1" stopColor="#0E0E0E" />
        </linearGradient>
        <linearGradient id="pm-glow-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>
      <rect x="16" y="16" width="480" height="480" rx="120" fill="url(#pm-bg-grad)" />
      <rect x="16" y="16" width="480" height="240" rx="120" fill="#FFFFFF" fillOpacity="0.06" />
      <rect x="140" y="130" width="82" height="262" rx="41" fill="url(#pm-glow-grad)" />
      <circle cx="296" cy="208" r="108" fill="#FFFFFF" />
      <circle cx="296" cy="208" r="36" fill="#0E0E0E" />
      <circle cx="394" cy="392" r="22" fill="#A8F139" />
    </svg>
  );

  if (!withWordmark) return mark;

  return (
    <span className={cn("inline-flex items-center gap-2.5")}>
      {mark}
      <span className={cn("font-semibold tracking-tight text-foreground", wordmarkClassName)}>
        {wordmark}
      </span>
    </span>
  );
}

export default Logo;
