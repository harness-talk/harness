#!/usr/bin/env node
// Bitcoin timestamps for each corpus, via OpenTimestamps. Two statements are anchored per corpus:
//   <id>.root.txt     the Merkle root of the finished text
//   <id>.sources.txt  the same root plus every upstream source URL and SHA-256 it was built from
//   node scripts/anchor-root.mjs           -> check every statement matches its corpus.json, then upgrade the proofs
//   node scripts/anchor-root.mjs --stamp   -> write fresh statements + proofs (only for statements whose root or sources changed)
// Requires the `ots` CLI (pip install opentimestamps-client); set OTS=/path/to/ots to override.
// Add a corpus here only once its text is final: a stamp is a public, permanent claim about that exact text.
import { readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { execFileSync } from "node:child_process";

const OTS = process.env.OTS || "ots";
const CORPORA = [
  { id: "kjv-1611", file: "data/corpus.json" },
  { id: "geneva-1599", file: "data/geneva/corpus.json" },
];

function collectSources(node, out = new Map()) {
  if (Array.isArray(node)) node.forEach((n) => collectSources(n, out));
  else if (node && typeof node === "object") {
    if (typeof node.url === "string" && typeof node.sha256 === "string") out.set(node.url, node.sha256);
    Object.values(node).forEach((v) => collectSources(v, out));
  }
  return out;
}

const statements = CORPORA.flatMap(({ id, file }) => {
  const corpus = JSON.parse(readFileSync(file, "utf8"));
  const head = `harness.talk ${id} merkle-root ${corpus.merkleRoot}\n`;
  const sources = [...collectSources(corpus)].sort(([a], [b]) => a.localeCompare(b));
  return [
    { path: `public/anchors/${id}.root.txt`, text: head },
    {
      path: `public/anchors/${id}.sources.txt`,
      text: head + `built from these sources (sha256 url):\n` + sources.map(([url, sha]) => `${sha} ${url}\n`).join(""),
    },
  ];
});

function run(args) {
  try {
    execFileSync(OTS, args, { stdio: "inherit" });
    return true;
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error(`Could not run "${OTS}". Install it (pip install opentimestamps-client) or set OTS=/path/to/ots.`);
      process.exit(1);
    }
    return false;
  }
}

const current = ({ path, text }) => existsSync(`${path}.ots`) && existsSync(path) && readFileSync(path, "utf8") === text;

if (process.argv.includes("--stamp")) {
  // Never restamp a statement whose proof already matches: that would throw away a Bitcoin-confirmed proof.
  const todo = statements.filter((s) => !current(s));
  for (const { path, text } of todo) {
    writeFileSync(path, text);
    if (existsSync(`${path}.ots`)) renameSync(`${path}.ots`, `${path}.ots.old`);
    run(["stamp", path]);
  }
  console.log(todo.length ? `Stamped ${todo.map((s) => s.path).join(", ")}. Pending until a Bitcoin block confirms; rerun without --stamp later.` : "Every statement already has a matching proof; nothing to stamp.");
  process.exit(0);
}

let stale = false;
for (const { path, text } of statements) {
  if (!current({ path, text })) {
    console.error(`${path} does not match data/corpus.json (or has no proof). Run with --stamp.`);
    stale = true;
    continue;
  }
  console.log(run(["upgrade", `${path}.ots`]) ? `${path}: proof points at a Bitcoin block.` : `${path}: still pending, try again in a few hours.`);
}
if (stale) process.exit(1);
