// SPDX-License-Identifier: AGPL-3.0-or-later
//! harness-conformance — an independent, third-language witness for harness.talk.
//!
//! The site, scripts and clients are JavaScript/TypeScript and Python. This binary
//! re-derives the same guarantees in Rust, sharing no code with them, so a bug in
//! one implementation cannot vouch for itself.
//!
//!   cargo run --release -- corpus     recompute every leaf + Merkle root of each export
//!   cargo run --release -- surfaces   manifest == MCP tools/list ⊆ TS client ⊆ Python client,
//!                                     and all three languages agree on verify()
//!   cargo run --release -- all        both (default)
//!
//! Run from the repository root (or pass --root <dir>). Exit code 0 = every check held.

use flate2::read::GzDecoder;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::collections::BTreeSet;
use std::fs::File;
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

type Res<T> = Result<T, String>;
type Step = fn(&Path, &mut Report) -> Res<()>;

fn sha256_hex(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect()
}

fn sha256_raw(bytes: &[u8]) -> [u8; 32] {
    let mut out = [0u8; 32];
    out.copy_from_slice(&Sha256::digest(bytes));
    out
}

fn leaf(reference: &str, text: &str) -> String {
    sha256_hex(format!("{reference}\n{text}").as_bytes())
}

/// leaf = sha256(ref\ntext); node = sha256(left || right); an odd node pairs with itself.
fn merkle_root(leaves: &[[u8; 32]]) -> Option<String> {
    if leaves.is_empty() {
        return None;
    }
    let mut level = leaves.to_vec();
    while level.len() > 1 {
        level = level
            .chunks(2)
            .map(|pair| {
                let (a, b) = (pair[0], *pair.get(1).unwrap_or(&pair[0]));
                let mut buf = [0u8; 64];
                buf[..32].copy_from_slice(&a);
                buf[32..].copy_from_slice(&b);
                sha256_raw(&buf)
            })
            .collect();
    }
    Some(level[0].iter().map(|b| format!("{b:02x}")).collect())
}

fn read_json(path: &Path) -> Res<Value> {
    let raw = std::fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
    serde_json::from_str(&raw).map_err(|e| format!("{}: {e}", path.display()))
}

fn read_export(path: &Path) -> Res<(Option<Value>, Vec<Value>)> {
    let mut text = String::new();
    GzDecoder::new(File::open(path).map_err(|e| format!("{}: {e}", path.display()))?)
        .read_to_string(&mut text)
        .map_err(|e| format!("{}: gunzip: {e}", path.display()))?;
    let mut rows = Vec::new();
    for (i, line) in text.lines().filter(|l| !l.is_empty()).enumerate() {
        rows.push(
            serde_json::from_str::<Value>(line)
                .map_err(|e| format!("{}:{}: {e}", path.display(), i + 1))?,
        );
    }
    let header = match rows.first() {
        Some(first) if first["kind"] == "corpus" => Some(rows.remove(0)),
        _ => None,
    };
    Ok((header, rows))
}

struct Report {
    failures: Vec<String>,
}

impl Report {
    fn pass(&self, msg: impl AsRef<str>) {
        println!("  ok    {}", msg.as_ref());
    }
    fn fail(&mut self, msg: impl Into<String>) {
        let msg = msg.into();
        println!("  FAIL  {msg}");
        if std::env::var_os("GITHUB_ACTIONS").is_some() {
            println!(
                "::error title=harness-conformance::{}",
                msg.replace('\n', " ")
            );
        }
        self.failures.push(msg);
    }
    fn check(&mut self, cond: bool, ok: impl AsRef<str>, bad: impl Into<String>) {
        if cond { self.pass(ok) } else { self.fail(bad) }
    }
}

// ---------------------------------------------------------------------------
// corpus: every export must hash to the root the site publishes
// ---------------------------------------------------------------------------

fn check_corpus(root: &Path, r: &mut Report) -> Res<()> {
    println!("corpus");
    let corpus = read_json(&root.join("data/corpus.json"))?;
    let published = corpus["merkleRoot"]
        .as_str()
        .ok_or("data/corpus.json has no merkleRoot")?
        .to_string();
    let expected_verses = corpus["verses"].as_u64().unwrap_or(0) as usize;

    let manifest = read_json(&root.join("public/exports/manifest.json"))?;
    let mut exports: BTreeSet<String> = BTreeSet::new();
    collect_jsonl_gz(&manifest, &mut exports);
    if exports.is_empty() {
        exports.insert("kjv-1611.jsonl.gz".into());
    }

    for name in exports {
        let file = name.rsplit('/').next().unwrap_or(&name).to_string();
        let path = root.join("public/exports").join(&file);
        if !path.exists() {
            r.fail(format!(
                "{file}: listed in exports manifest but missing on disk"
            ));
            continue;
        }
        let (header, rows) = read_export(&path)?;
        let mut leaves = Vec::with_capacity(rows.len());
        let mut bad_leaves = Vec::new();
        let mut seen = BTreeSet::new();
        for v in &rows {
            let (Some(reference), Some(text)) = (v["ref"].as_str(), v["text"].as_str()) else {
                bad_leaves.push(format!("row without ref/text: {v}"));
                continue;
            };
            if !seen.insert(reference.to_string()) {
                bad_leaves.push(format!("duplicate ref {reference}"));
            }
            let h = leaf(reference, text);
            if let Some(claimed) = v["sha256"].as_str()
                && claimed != h
            {
                bad_leaves.push(format!(
                    "{reference}: row sha256 {claimed} != recomputed {h}"
                ));
            }
            let mut raw = [0u8; 32];
            for (i, chunk) in h.as_bytes().chunks(2).enumerate() {
                raw[i] = u8::from_str_radix(std::str::from_utf8(chunk).unwrap(), 16).unwrap();
            }
            leaves.push(raw);
        }
        let computed = merkle_root(&leaves).unwrap_or_default();
        let source = header
            .as_ref()
            .and_then(|h| h["source"].as_str())
            .unwrap_or("?")
            .to_string();

        r.check(
            bad_leaves.is_empty(),
            format!(
                "{file}: {} leaves recomputed, all match their row hash",
                leaves.len()
            ),
            format!(
                "{file}: {} bad leaves, first: {}",
                bad_leaves.len(),
                bad_leaves.first().cloned().unwrap_or_default()
            ),
        );
        if let Some(h) = &header {
            let header_root = h["merkleRoot"].as_str().unwrap_or("");
            r.check(
                header_root == computed,
                format!(
                    "{file}: header root matches recomputed {}",
                    &computed[..16.min(computed.len())]
                ),
                format!("{file}: header root {header_root} != recomputed {computed}"),
            );
        }
        if source == corpus["source"].as_str().unwrap_or("") {
            r.check(
                computed == published,
                format!("{file}: root equals data/corpus.json ({source})"),
                format!("{file}: root {computed} != published {published}"),
            );
            r.check(
                rows.len() == expected_verses,
                format!("{file}: {} verses", rows.len()),
                format!(
                    "{file}: {} verses, corpus.json says {expected_verses}",
                    rows.len()
                ),
            );
        }
    }
    Ok(())
}

fn collect_jsonl_gz(v: &Value, out: &mut BTreeSet<String>) {
    match v {
        Value::String(s) if s.ends_with(".jsonl.gz") => {
            out.insert(s.clone());
        }
        Value::Array(a) => a.iter().for_each(|x| collect_jsonl_gz(x, out)),
        Value::Object(o) => o.iter().for_each(|(k, x)| {
            if k.ends_with(".jsonl.gz") {
                out.insert(k.clone());
            }
            collect_jsonl_gz(x, out)
        }),
        _ => {}
    }
}

// ---------------------------------------------------------------------------
// surfaces: one manifest, four faces (manifest, MCP, TypeScript, Python)
// ---------------------------------------------------------------------------

fn run(cmd: &str, args: &[&str], cwd: &Path, stdin: &str) -> Res<String> {
    let mut child = Command::new(cmd)
        .args(args)
        .current_dir(cwd)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("cannot start {cmd}: {e}"))?;
    child
        .stdin
        .take()
        .unwrap()
        .write_all(stdin.as_bytes())
        .map_err(|e| e.to_string())?;
    let out = child.wait_with_output().map_err(|e| e.to_string())?;
    if !out.status.success() {
        return Err(format!(
            "{cmd} {} exited {}: {}",
            args.join(" "),
            out.status,
            String::from_utf8_lossy(&out.stderr)
        ));
    }
    Ok(String::from_utf8_lossy(&out.stdout).into_owned())
}

fn names(v: &Value) -> BTreeSet<String> {
    v.as_array()
        .into_iter()
        .flatten()
        .filter_map(|x| x.as_str().map(String::from))
        .collect()
}

fn mcp_tool_names(root: &Path, node: &str) -> Res<BTreeSet<String>> {
    let mut child = Command::new(node)
        .arg("packages/harness/mcp/server.mjs")
        .current_dir(root)
        .env("HARNESS_BASE_URL", "http://127.0.0.1:9") // tools/list must not need the network
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("cannot start MCP server: {e}"))?;
    let mut stdin = child.stdin.take().unwrap();
    let frames = [
        json!({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"harness-conformance","version":env!("CARGO_PKG_VERSION")}}}),
        json!({"jsonrpc":"2.0","method":"notifications/initialized"}),
        json!({"jsonrpc":"2.0","id":2,"method":"tools/list"}),
    ];
    for f in frames {
        writeln!(stdin, "{f}").map_err(|e| e.to_string())?;
    }
    drop(stdin);

    let mut tools = None;
    let mut initialized = false;
    for line in BufReader::new(child.stdout.take().unwrap()).lines() {
        let Ok(line) = line else { break };
        let Ok(msg) = serde_json::from_str::<Value>(&line) else {
            continue;
        };
        if msg["id"] == 1 && msg["result"]["protocolVersion"].is_string() {
            initialized = true;
        }
        if msg["id"] == 2 {
            tools = Some(
                msg["result"]["tools"]
                    .as_array()
                    .cloned()
                    .unwrap_or_default(),
            );
        }
    }
    let _ = child.wait();
    if !initialized {
        return Err("MCP server did not answer initialize".into());
    }
    let tools = tools.ok_or("MCP server did not answer tools/list")?;
    for t in &tools {
        if !t["inputSchema"].is_object() {
            return Err(format!("MCP tool {} has no inputSchema object", t["name"]));
        }
    }
    Ok(tools
        .iter()
        .filter_map(|t| t["name"].as_str().map(String::from))
        .collect())
}

fn check_surfaces(root: &Path, r: &mut Report) -> Res<()> {
    println!("surfaces");
    let node = std::env::var("NODE").unwrap_or_else(|_| "node".into());
    let python = std::env::var("PYTHON").unwrap_or_else(|_| "python3".into());

    let manifest = read_json(&root.join("packages/harness/client/manifest.json"))?;
    let tools = manifest["tools"]
        .as_array()
        .ok_or("manifest.json has no tools[]")?;
    let declared: BTreeSet<String> = tools
        .iter()
        .filter_map(|t| t["name"].as_str().map(String::from))
        .collect();
    r.check(
        declared.len() == tools.len() && !declared.is_empty(),
        format!("manifest: {} uniquely named tools", declared.len()),
        "manifest: duplicate or missing tool names",
    );

    let mcp = mcp_tool_names(root, &node)?;
    r.check(
        mcp == declared,
        "MCP tools/list == manifest",
        format!("MCP tools/list {mcp:?} != manifest {declared:?}"),
    );

    let ts = names(&serde_json::from_str(&run(
        &node,
        &["--input-type=module", "-e", "const m = await import('./packages/harness/client/index.mjs'); const c = m.createClient(); console.log(JSON.stringify(Object.keys(c).filter(k => typeof c[k] === 'function')))"],
        root,
        "",
    )?).map_err(|e| e.to_string())?);
    let missing: Vec<_> = declared.difference(&ts).collect();
    r.check(
        missing.is_empty(),
        "TypeScript client implements every tool",
        format!("TypeScript client missing {missing:?}"),
    );

    let py = names(&serde_json::from_str(&run(
        &python,
        &["-c", "import sys, json; sys.path.insert(0, 'packages/harness/python'); import harness_talk as h; print(json.dumps([n for n in dir(h.Harness) if not n.startswith('_') and callable(getattr(h.Harness, n))]))"],
        root,
        "",
    )?).map_err(|e| e.to_string())?);
    let missing: Vec<_> = declared.difference(&py).collect();
    r.check(
        missing.is_empty(),
        "Python client implements every tool",
        format!("Python client missing {missing:?}"),
    );

    // Cross-language verify(): sample verses spread over the canon, plus a one-byte tamper of each.
    let (_, rows) = read_export(&root.join("public/exports/kjv-1611.jsonl.gz"))?;
    let step = (rows.len() / 64).max(1);
    let mut sample: Vec<Value> = rows.iter().step_by(step).cloned().collect();
    let n = sample.len();
    for i in 0..n {
        let mut t = sample[i].clone();
        t["text"] = json!(format!("{} ", t["text"].as_str().unwrap_or("")));
        sample.push(t);
    }
    let rust: Vec<bool> = sample
        .iter()
        .map(|v| {
            leaf(
                v["ref"].as_str().unwrap_or(""),
                v["text"].as_str().unwrap_or(""),
            ) == v["sha256"].as_str().unwrap_or("-")
        })
        .collect();
    let input = serde_json::to_string(&sample).unwrap();

    let ts_verdicts: Vec<bool> = serde_json::from_str(&run(
        &node,
        &["--input-type=module", "-e", "const { verify } = await import('./packages/harness/client/index.mjs'); let s=''; for await (const c of process.stdin) s+=c; const vs = JSON.parse(s); console.log(JSON.stringify(await Promise.all(vs.map(verify))))"],
        root,
        &input,
    )?).map_err(|e| e.to_string())?;
    let py_verdicts: Vec<bool> = serde_json::from_str(&run(
        &python,
        &["-c", "import sys, json; sys.path.insert(0, 'packages/harness/python'); from harness_talk import verify; print(json.dumps([verify(v) for v in json.load(sys.stdin)]))"],
        root,
        &input,
    )?).map_err(|e| e.to_string())?;

    let expected: Vec<bool> = (0..sample.len()).map(|i| i < n).collect();
    r.check(
        rust == expected,
        format!("Rust verify: {n} genuine accepted, {n} tampered rejected"),
        "Rust verify disagrees with expectation",
    );
    r.check(
        ts_verdicts == rust,
        "TypeScript verify agrees with Rust on every sample",
        format!("TypeScript verify disagrees: {ts_verdicts:?}"),
    );
    r.check(
        py_verdicts == rust,
        "Python verify agrees with Rust on every sample",
        format!("Python verify disagrees: {py_verdicts:?}"),
    );
    Ok(())
}

fn main() {
    let mut args: Vec<String> = std::env::args().skip(1).collect();
    let mut root = PathBuf::from(".");
    if let Some(i) = args.iter().position(|a| a == "--root") {
        root = PathBuf::from(args.get(i + 1).cloned().unwrap_or_else(|| ".".into()));
        args.drain(i..(i + 2).min(args.len()));
    }
    let mode = args.first().map(String::as_str).unwrap_or("all");
    if !root.join("packages/harness/client/manifest.json").exists() {
        eprintln!("harness-conformance: run from the repository root or pass --root <dir>");
        std::process::exit(2);
    }

    let mut r = Report {
        failures: Vec::new(),
    };
    let steps: Vec<(&str, Step)> = match mode {
        "corpus" => vec![("corpus", check_corpus)],
        "surfaces" => vec![("surfaces", check_surfaces)],
        "all" => vec![("corpus", check_corpus), ("surfaces", check_surfaces)],
        other => {
            eprintln!("unknown mode {other:?}; use corpus | surfaces | all");
            std::process::exit(2);
        }
    };
    for (name, step) in steps {
        if let Err(e) = step(&root, &mut r) {
            r.fail(format!("{name}: {e}"));
        }
    }
    if r.failures.is_empty() {
        println!("\nall checks held");
    } else {
        println!("\n{} check(s) failed", r.failures.len());
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn leaf_is_ref_newline_text() {
        assert_eq!(leaf("gn.1.1", "x"), sha256_hex(b"gn.1.1\nx"));
    }

    #[test]
    fn odd_node_pairs_with_itself() {
        let a = sha256_raw(b"a");
        let mut buf = [0u8; 64];
        buf[..32].copy_from_slice(&a);
        buf[32..].copy_from_slice(&a);
        let expected: String = sha256_raw(&buf)
            .iter()
            .map(|b| format!("{b:02x}"))
            .collect();
        assert_eq!(
            merkle_root(&[a]).unwrap(),
            a.iter().map(|b| format!("{b:02x}")).collect::<String>()
        );
        assert_eq!(merkle_root(&[a, a]).unwrap(), expected);
    }
}
