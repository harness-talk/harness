/**
 * The layer stack, drawn as a printed table rather than a "cloud diagram":
 * kernel → lo → harnessd → agent processes, with the actual verse flowing back up.
 */
const LAYERS: { name: string; owner: string; role: string; example: string }[] = [
  {
    name: "Agent processes",
    owner: "userland",
    role: "Any program — a model runtime, a shell script, curl — opens a socket to a quartet.",
    example: "GET 127.43.3.16:1611",
  },
  {
    name: "harnessd",
    owner: "userland · this project",
    role: "Reads the destination address, looks up the verse in the in-memory corpus, answers with exact text and its SHA-256.",
    example: "text/plain · application/json · problem+json",
  },
  {
    name: "lo (loopback)",
    owner: "kernel",
    role: "Linux routes all of 127.0.0.0/8 to this interface; every quartet is already a valid local address.",
    example: "ip route show table local → local 127.0.0.0/8 dev lo",
  },
  {
    name: "Linux kernel",
    owner: "kernel",
    role: "Owns the interface and the TCP stack. Unmodified.",
    example: "no module · no patch · no capability beyond bind()",
  },
];

export function LoopbackDiagram() {
  return (
    <figure className="not-prose mt-8">
      <ol className="flex flex-col" aria-label="Layer stack from agent processes down to the kernel">
        {LAYERS.map((l, i) => (
          <li
            key={l.name}
            className="grid grid-cols-1 gap-2 border-t border-rule py-4 md:grid-cols-[11rem_minmax(0,1fr)_16rem] md:gap-6"
          >
            <div className="flex flex-col">
              <span className="font-display text-lg text-foreground">{l.name}</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-foreground/50">{l.owner}</span>
            </div>
            <p className="text-[0.95rem] leading-relaxed text-foreground/80">{l.role}</p>
            <code className="self-start font-mono text-[0.75rem] leading-relaxed text-rubric md:justify-self-end md:text-right">
              {l.example}
            </code>
            {i === 0 && <span className="sr-only">Request travels down; the verse returns up.</span>}
          </li>
        ))}
      </ol>
      <figcaption className="mt-4 border-t border-gilt/60 pt-3 font-mono text-xs text-foreground/60">
        A request enters at the top and the verse returns the same way. Nothing below harnessd is changed.
      </figcaption>
    </figure>
  );
}
