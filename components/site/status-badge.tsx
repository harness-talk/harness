import type { ReactNode } from "react";

export type Status = "live" | "spec" | "partial";

const LABEL: Record<Status, string> = { live: "Live", spec: "Specification · not yet live", partial: "Partial" };

/** Live = gilt rule; Specification = slate outline. Never ambiguous. Children override the label. */
export function StatusBadge({
  status,
  className = "",
  children,
}: {
  status: Status;
  className?: string;
  children?: ReactNode;
}) {
  const label = children ?? LABEL[status];
  if (status === "live") {
    return (
      <span className={`badge-live ${className}`}>
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-gilt" />
        {label}
      </span>
    );
  }
  if (status === "partial") {
    return <span className={`badge-spec border-gilt/50 text-gilt ${className}`}>{label}</span>;
  }
  return <span className={`badge-spec ${className}`}>{label}</span>;
}
