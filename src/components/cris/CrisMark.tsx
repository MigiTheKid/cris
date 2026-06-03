/** Emblema CRIS: escudo (proteção / São Cristóvão) + gota-chama âmbar. */
export function CrisMark({ size = 34 }: { size?: number }) {
  return (
    <div className="cris-mark" style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id="cris-mark-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--brand-amber)" />
            <stop offset="1" stopColor="#f0a800" />
          </linearGradient>
        </defs>
        <path
          d="M24 3 7 9v13c0 11 7.6 18.4 17 21 9.4-2.6 17-10 17-21V9L24 3z"
          fill="color-mix(in oklab, var(--brand-teal) 88%, black)"
          stroke="color-mix(in oklab, var(--brand-amber) 38%, transparent)"
          strokeWidth="1"
        />
        <path
          d="M24 14s7 7.4 7 12.4A7 7 0 1 1 17 26.4C17 21.4 24 14 24 14z"
          fill="url(#cris-mark-grad)"
        />
      </svg>
    </div>
  );
}
