import { Fragment } from "react";

const DIVINE = /\b(LORD|GOD|JEHOVAH|I AM)\b/g;

/**
 * Renders verse text exactly as ingested, but sets the all-caps divine name in true small caps
 * (as the 1611 and every letterpress edition does). The underlying string is untouched —
 * copy/paste yields the source text.
 */
export function VerseText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  DIVINE.lastIndex = 0;
  while ((m = DIVINE.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <span key={m.index} className="smcp">
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>{p}</Fragment>
      ))}
    </>
  );
}
