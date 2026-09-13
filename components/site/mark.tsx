/** The mark: a loopback ring with four points — the quartet — around a cross. Single-color, prints well. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="16" cy="16" r="13" />
      <path d="M16 8v16M8 16h16" strokeLinecap="square" />
      <circle cx="16" cy="3" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="29" cy="16" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="16" cy="29" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="3" cy="16" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
