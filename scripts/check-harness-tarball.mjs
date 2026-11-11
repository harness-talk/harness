// Fails when public/downloads/harness-talk.tgz no longer matches packages/harness.
// Rebuild with: npm run pack:harness
import { readFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const tgz = path.join(root, "public/downloads/harness-talk.tgz");
const pkgDir = path.join(root, "packages/harness");

const tar = gunzipSync(readFileSync(tgz));
const stale = [];
let count = 0;
for (let off = 0; off + 512 <= tar.length; ) {
  const header = tar.subarray(off, off + 512);
  const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/s, "");
  if (!name) break;
  const prefix = header.subarray(345, 500).toString("utf8").replace(/\0.*$/s, "");
  const size = parseInt(header.subarray(124, 136).toString("utf8").trim() || "0", 8);
  const type = String.fromCharCode(header[156] || 48);
  const full = (prefix ? `${prefix}/` : "") + name;
  const data = tar.subarray(off + 512, off + 512 + size);
  off += 512 + Math.ceil(size / 512) * 512;
  if (type !== "0" || !full.startsWith("package/")) continue;
  count++;
  const rel = full.slice("package/".length);
  const src = path.join(pkgDir, rel);
  // npm pack rewrites package.json formatting; compare it structurally.
  if (rel === "package.json") {
    if (JSON.stringify(JSON.parse(data)) !== JSON.stringify(JSON.parse(readFileSync(src)))) stale.push(rel);
  } else if (!existsSync(src) || !readFileSync(src).equals(data)) {
    stale.push(rel);
  }
}

if (stale.length) {
  console.error(`harness-talk.tgz is out of date (${stale.join(", ")}). Run: npm run pack:harness`);
  process.exit(1);
}
console.log(`harness-talk.tgz matches packages/harness (${count} files).`);
