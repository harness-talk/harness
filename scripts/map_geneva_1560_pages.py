#!/usr/bin/env python3
"""Map every book+chapter of the 1560 Geneva Bible to the scan leaf it opens on.

Inputs (SHA-locked by scripts/fetch-sources.mjs, stdlib only, no OCR engine needed):
  data/raw/geneva-1560-hocr_pageindex.json.gz   per-leaf offsets into the search text
  data/raw/geneva-1560-hocr_searchtext.txt.gz   the archive's OCR, in page order
  data/books.json                               canonical 66-book chapter counts
  data/facsimile/geneva-1560.json               hand-verified sample leaves (the check)

Method:
  1. Split the OCR into its 1,224 leaves.
  2. Find printed chapter headings. The 1560 sets them in capitals ("CHAP. XII.",
     "PSAL. XXIII."); lowercase "Chap 12,5." is a margin cross-reference and is ignored.
  3. Drop front matter and the Apocrypha block (running head "Apocrypha"), which is not
     in the 66-book canon and would otherwise restart the chapter count.
  4. Align the detected numbers against the expected sequence gn 1 .. re 22 with a
     longest-common-subsequence pass, so OCR misses and stray matches cannot reorder pages.
  5. Chapters whose heading was not read are interpolated between their detected
     neighbours and flagged "e" (estimated) instead of "d" (detected).

Output: data/facsimile/geneva-1560-chapters.json. Leaf numbers only; no text is served.
Run:    python3 scripts/map_geneva_1560_pages.py   (exits 1 if a hand sample disagrees)
"""

from __future__ import annotations

import gzip
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
INDEX = RAW / "geneva-1560-hocr_pageindex.json.gz"
TEXT = RAW / "geneva-1560-hocr_searchtext.txt.gz"
BOOKS = ROOT / "data" / "books.json"
FACSIMILE = ROOT / "data" / "facsimile" / "geneva-1560.json"
OUT = ROOT / "data" / "facsimile" / "geneva-1560-chapters.json"

# A hand sample may sit one leaf off: a chapter heading near the foot of a page
# is "on" that leaf while a human might note the following opening.
SAMPLE_TOLERANCE = 1

HEADING = re.compile(r"(?:C\s?H\s?A\s?P|P\s?S\s?A\s?L)\s?[.,:;?]{0,2}\s*([IVXLivxl1|!'\s]{1,16})")
VALID_ROMAN = re.compile(r"^C?(XC|XL|L?X{0,4})(IX|IV|V?I{0,4})$")
ROMAN = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def roman_value(raw: str) -> int | None:
    s = re.sub(r"[\s']", "", raw)
    s = s.translate(str.maketrans({"1": "I", "l": "I", "|": "I", "!": "I", "i": "I", "v": "V", "x": "X"}))
    s = s.upper()
    candidates = [s]
    # OCR often reads a final I as L ("XIIL" for XIII).
    if s.endswith("L"):
        candidates.append(s[:-1] + "I")
    for c in candidates:
        if not c or not VALID_ROMAN.match(c):
            continue
        total = 0
        for i, ch in enumerate(c):
            v = ROMAN[ch]
            nxt = ROMAN[c[i + 1]] if i + 1 < len(c) else 0
            total += -v if v < nxt else v
        if 1 <= total <= 150:
            return total
    return None


def load_pages() -> list[str]:
    index = json.loads(gzip.decompress(INDEX.read_bytes()))
    text = gzip.decompress(TEXT.read_bytes()).decode("utf-8", "replace")
    return [text[row[0] : row[1]] for row in index]


def apocrypha_range(pages: list[str]) -> tuple[int, int] | None:
    hits = [i for i, p in enumerate(pages) if "apocryp" in p.split("\n", 1)[0].lower()]
    return (hits[0], hits[-1]) if hits else None


def detect(pages: list[str], skip: set[int]) -> list[tuple[int, int]]:
    events = []
    for leaf, page in enumerate(pages):
        if leaf in skip:
            continue
        for m in HEADING.finditer(page):
            n = roman_value(m.group(1))
            if n is not None:
                events.append((leaf, n))
    return events


def align(targets: list[int], events: list[tuple[int, int]]) -> dict[int, int]:
    """LCS of expected chapter numbers vs detected ones -> {target index: leaf}."""
    n, m = len(targets), len(events)
    prev = [0] * (m + 1)
    rows = [prev]
    for i in range(1, n + 1):
        cur = [0] * (m + 1)
        t = targets[i - 1]
        for j in range(1, m + 1):
            if t == events[j - 1][1]:
                cur[j] = prev[j - 1] + 1
            else:
                cur[j] = cur[j - 1] if cur[j - 1] >= prev[j] else prev[j]
        rows.append(cur)
        prev = cur
    matched: dict[int, int] = {}
    i, j = n, m
    while i > 0 and j > 0:
        if targets[i - 1] == events[j - 1][1] and rows[i][j] == rows[i - 1][j - 1] + 1:
            matched[i - 1] = events[j - 1][0]
            i -= 1
            j -= 1
        elif rows[i - 1][j] >= rows[i][j - 1]:
            i -= 1
        else:
            j -= 1
    return matched


def main() -> int:
    books = json.loads(BOOKS.read_text())
    fac = json.loads(FACSIMILE.read_text())
    pages = load_pages()

    front = int(fac["frontMatterLeaves"])
    skip = set(range(front))
    apoc = apocrypha_range(pages)
    if apoc:
        skip |= set(range(apoc[0], apoc[1] + 1))

    targets: list[int] = []
    owners: list[tuple[str, int]] = []
    for b in books:
        for ch in range(1, b["chapters"] + 1):
            targets.append(ch)
            owners.append((b["id"], ch))

    events = detect(pages, skip)
    matched = align(targets, events)

    # Interpolate gaps between detected anchors (global order, so book seams interpolate too).
    leaves: list[float] = [0.0] * len(targets)
    anchors = sorted(matched.items())
    first_leaf = front
    last_leaf = len(pages) - 1
    padded = [(-1, first_leaf)] + anchors + [(len(targets), last_leaf)]
    for (ia, la), (ib, lb) in zip(padded, padded[1:]):
        for k in range(ia + 1, ib):
            leaves[k] = la + (lb - la) * (k - ia) / (ib - ia)
        if 0 <= ib < len(targets):
            leaves[ib] = lb

    def snap(k: int) -> int:
        leaf = round(leaves[k])
        # Never let an estimate land inside the Apocrypha block.
        if apoc and apoc[0] <= leaf <= apoc[1]:
            leaf = apoc[0] - 1 if owners[k][0] != "mt" and books_index[owners[k][0]] < books_index["mt"] else apoc[1] + 1
        return leaf

    books_index = {b["id"]: i for i, b in enumerate(books)}
    chapters: dict[str, list[int]] = {}
    flags: dict[str, str] = {}
    for k, (bid, _ch) in enumerate(owners):
        chapters.setdefault(bid, []).append(snap(k))
        flags[bid] = flags.get(bid, "") + ("d" if k in matched else "e")

    # Enforce non-decreasing leaves (an OCR misread can never send a later chapter backwards).
    flat_prev = -1
    for b in books:
        arr = chapters[b["id"]]
        for i, leaf in enumerate(arr):
            if leaf < flat_prev:
                arr[i] = flat_prev
            flat_prev = arr[i]

    failures = []
    for s in fac.get("samples", []):
        got = chapters[s["book"]][s["chapter"] - 1]
        ok = abs(got - s["leaf"]) <= SAMPLE_TOLERANCE
        print(f"sample {s['book']} {s['chapter']:>3}: hand {s['leaf']:>4}  script {got:>4}  {'ok' if ok else 'MISMATCH'}")
        if not ok:
            failures.append(s)

    detected = sum(f.count("d") for f in flags.values())
    total = len(targets)
    print(f"headings read: {len(events)}  chapters detected: {detected}/{total} ({100 * detected / total:.1f}%)")
    if apoc:
        print(f"apocrypha leaves skipped: {apoc[0]}-{apoc[1]}")
    weak = [b["id"] for b in books if flags[b["id"]].count("d") / len(flags[b["id"]]) < 0.5]
    if weak:
        print("books under 50% detected (estimates only): " + ", ".join(weak))

    out = {
        "identifier": fac["identifier"],
        "generatedBy": "scripts/map_geneva_1560_pages.py",
        "inputs": {
            "geneva-1560-hocr_pageindex.json.gz": sha256(INDEX),
            "geneva-1560-hocr_searchtext.txt.gz": sha256(TEXT),
        },
        "note": "0-based archive leaf on which each chapter heading is printed. 'd' = heading read from the OCR; 'e' = estimated between detected neighbours. Leaf numbers only; no text from these inputs is served.",
        "leaves": len(pages),
        "apocrypha": list(apoc) if apoc else None,
        "detected": detected,
        "total": total,
        "chapters": chapters,
        "flags": flags,
    }
    OUT.write_text(json.dumps(out, separators=(",", ":")) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
