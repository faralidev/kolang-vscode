'use strict';

// ---------------------------------------------------------------------------
// fetch-data.js — fetch-at-build for language data + snippets
//
// This script replaces the old "committed copy" of kolang-docs.json inside
// kolang-vscode/data/. There is no committed copy anymore: `npm run package`
// (via the `prepackage` hook) runs this script first, so the .vsix always ships
// fresh language data fetched from the canonical source (kolang-data).
// No committed copy = no drift.
//
// It fetches BOTH canonical files from kolang-data at build time:
//   1. kolang-docs.json → data/kolang-docs.json  (hover docs + completions)
//   2. snippets.json    → snippets/kolang.json   (native TextMate snippet
//      insertion with tabstops)
//
// Data source (tried in order):
//   1. ../kolang-data/{kolang-docs.json,snippets.json} — sibling clone (local dev)
//   2. https://raw.githubusercontent.com/faralidev/kolang-data/main/...
//      — CI / production (no sibling repo available)
//
// Shape transform: the canonical kolang-docs.json is organized as keywords /
// builtins / types / modules / exceptions / verbs / literals. extension.js
// reads keywords / functions / types / modules / exceptions / literals /
// snippets, so this script applies the same transform the old sync-vscode.sh
// used:
//   functions = builtins + verbs
//
// Snippets have their own canonical file (kolang-data/snippets.json). The
// completions' `snippets` array inside data/kolang-docs.json is derived from
// the same canonical snippets, so there is a single source of truth for both
// snippet consumers (TextMate insertion + completion providers).
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_URL = 'https://raw.githubusercontent.com/faralidev/kolang-data/main/kolang-docs.json';
const SNIPPETS_URL = 'https://raw.githubusercontent.com/faralidev/kolang-data/main/snippets.json';

const ROOT = path.resolve(__dirname, '..');
const LOCAL_SOURCE = path.resolve(ROOT, '..', 'kolang-data', 'kolang-docs.json');
const LOCAL_SNIPPETS_SOURCE = path.resolve(ROOT, '..', 'kolang-data', 'snippets.json');
const DEST = path.join(ROOT, 'data', 'kolang-docs.json');
const DEST_SNIPPETS = path.join(ROOT, 'snippets', 'kolang.json');

// Canonical snippets object ({ title: { prefix, body, description } }) →
// [{ label, detail, body }] array used by extension.js completions.
function snippetsFromCanonical(snippetsObj) {
  return Object.values(snippetsObj || {}).map((s) => ({
    label: s.prefix,
    detail: s.description || s.prefix,
    body: Array.isArray(s.body) ? s.body.join('\n') : String(s.body),
  }));
}

// Canonical kolang-data shape → shape expected by extension.js.
function transform(data, snippetCompletions) {
  return {
    _comment:
      'دادهٔ مستندات زبان کلنگ برای افزونهٔ VS Code — هنگام ساخت (build) از مخزن kolang-data (منبع حقیقی) دریافت می‌شود؛ نسخهٔ تعهدشده در مخزن وجود ندارد.',
    _version: data._version || '0.0.1',
    keywords: data.keywords || [],
    functions: (data.builtins || []).concat(data.verbs || []),
    types: data.types || [],
    modules: data.modules || [],
    exceptions: data.exceptions || [],
    literals: data.literals || [],
    snippets: snippetCompletions || [],
  };
}

function readLocalSource() {
  try {
    return { data: JSON.parse(fs.readFileSync(LOCAL_SOURCE, 'utf8')), from: 'local' };
  } catch (_) {
    return null;
  }
}

function readLocalSnippetsSource() {
  try {
    return JSON.parse(fs.readFileSync(LOCAL_SNIPPETS_SOURCE, 'utf8'));
  } catch (_) {
    return null;
  }
}

function fetchUrl(url, redirectsLeft) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { 'User-Agent': 'kolang-vscode/fetch-data' } },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
          res.resume(); // discard body of the redirect response
          resolve(fetchUrl(new URL(res.headers.location, url).toString(), redirectsLeft - 1));
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
  });
}

async function main() {
  // --- kolang-docs.json (hover docs + identifier completions) ---
  const local = readLocalSource();
  let data;
  let source;
  if (local) {
    data = local.data;
    source = local.from;
  } else {
    data = await fetchUrl(DATA_URL, 5);
    source = 'url';
  }

  // --- snippets.json (canonical snippets, same source as the docs above) ---
  let snippetsData;
  const localSnippets = readLocalSnippetsSource();
  if (source === 'local' && localSnippets) {
    snippetsData = localSnippets;
  } else {
    snippetsData = await fetchUrl(SNIPPETS_URL, 5);
  }
  const snippetCompletions = snippetsFromCanonical(snippetsData.snippets);

  // Native TextMate snippet file (tabstops/placeholders work here).
  fs.mkdirSync(path.dirname(DEST_SNIPPETS), { recursive: true });
  fs.writeFileSync(DEST_SNIPPETS, JSON.stringify(snippetsData.snippets || {}, null, 2) + '\n');

  // Docs file (completions + hover), with snippets derived from the same
  // canonical source.
  fs.mkdirSync(path.dirname(DEST), { recursive: true });
  fs.writeFileSync(DEST, JSON.stringify(transform(data, snippetCompletions), null, 2) + '\n');

  const sourceLabel = source === 'local' ? 'مخزن محلی kolang-data' : 'مخزن دور kolang-data (GitHub)';
  console.log(
    `✓ دادهٔ مستندات کلنگ و قطعه‌کدها از ${sourceLabel} دریافت شد؛ در data/kolang-docs.json و snippets/kolang.json نوشته شد.`
  );
}

main().catch((err) => {
  console.error('✗ دریافت دادهٔ مستندات کلنگ ناموفق بود:', err.message);
  process.exit(1);
});