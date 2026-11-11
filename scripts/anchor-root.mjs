#!/usr/bin/env node
// Bitcoin timestamp for the corpus Merkle root, via OpenTimestamps.
//   node scripts/anchor-root.mjs           -> check the statement matches data/corpus.json, then upgrade the proof
//   node scripts/anchor-root.mjs --stamp   -> write a fresh statement + proof (only when the root changes)
// Requires the `ots` CLI (pip install opentimestamps-client); set OTS=/path/to/ots to override.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const OTS = process.env.OTS || "ots";
const statementPath = "public/anchors/kjv-1611.root.txt";
const proofPath = `${statementPath}.ots`;
const { merkleRoot } = JSON.parse(readFileSync("data/corpus.json", "utf8"));
const statement = `harness.talk kjv-1611 merkle-root ${merkleRoot}\n`;

if (process.argv.includes("--stamp")) {
  writeFileSync(statementPath, statement);
  execFileSync(OTS, ["stamp", statementPath], { stdio: "inherit" });
  console.log(`Stamped ${merkleRoot}. Proof is pending until a Bitcoin block confirms it; rerun without --stamp later.`);
  process.exit(0);
}

if (!existsSync(proofPath) || readFileSync(statementPath, "utf8") !== statement) {
  console.error(`The anchored statement does not match the current root ${merkleRoot}. Run with --stamp.`);
  process.exit(1);
}

try {
  execFileSync(OTS, ["upgrade", proofPath], { stdio: "inherit" });
  console.log("Proof upgraded: it now points at a Bitcoin block. Commit the updated .ots file.");
} catch {
  console.log("Still pending: no Bitcoin block has confirmed it yet. Try again in a few hours.");
}
