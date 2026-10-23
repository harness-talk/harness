import { createHash } from "node:crypto";

/**
 * Canonical harness Merkle tree, identical to harnessd and the corpus root:
 *   leaf = the verse's sha256 (hex)
 *   node = sha256(left_bytes || right_bytes), an odd node is paired with itself
 *   root = hex of the final digest
 * Used to give a verse span one hash that any holder of the same text can recompute.
 */
export function merkleRoot(leafHexes: string[]): string {
  if (!leafHexes.length) return createHash("sha256").update("").digest("hex");
  let level: Buffer[] = leafHexes.map((h) => Buffer.from(h, "hex"));
  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const l = level[i];
      const r = level[i + 1] ?? level[i];
      next.push(createHash("sha256").update(Buffer.concat([l, r])).digest());
    }
    level = next;
  }
  return level[0].toString("hex");
}
