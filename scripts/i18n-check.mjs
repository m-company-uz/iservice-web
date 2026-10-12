#!/usr/bin/env node
/**
 * Copied from crm-frontend (DEVELOPMENT_PLAN §8). Guards the most likely bilingual regression:
 * a key present in ru.json but missing from uz.json. Also catches ICU placeholder drift, which
 * throws at render time rather than showing a missing string.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (l) => JSON.parse(readFileSync(join(root, 'src/messages', `${l}.json`), 'utf8'));

/** Flattens to `a.b.c` -> string, so two trees can be diffed as key sets. */
function flatten(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out.set(key, String(v));
  }
  return out;
}

/** `{count, plural, ...}` and `{name}` both surface as `count` / `name`. */
const placeholders = (s) =>
  new Set([...s.matchAll(/\{\s*([a-zA-Z0-9_]+)\s*[,}]/g)].map((m) => m[1]));

const ru = flatten(load('ru'));
const uz = flatten(load('uz'));
const problems = [];

for (const key of ru.keys()) if (!uz.has(key)) problems.push(`missing in uz.json: ${key}`);
for (const key of uz.keys()) if (!ru.has(key)) problems.push(`missing in ru.json: ${key}`);

for (const [key, value] of ru) {
  if (!uz.has(key)) continue;
  const a = placeholders(value);
  const b = placeholders(uz.get(key));
  const only = (x, y) => [...x].filter((p) => !y.has(p));
  if (only(a, b).length || only(b, a).length) {
    problems.push(
      `placeholder mismatch at ${key}: ru{${[...a].join(',')}} vs uz{${[...b].join(',')}}`,
    );
  }
  if (!uz.get(key).trim()) problems.push(`empty uz value: ${key}`);
}

// Uzbek Latin: oʻ/gʻ use ʻ (U+02BB), the tutuq belgisi uses ʼ (U+02BC), as the design does.
// ASCII ' and typographic quotes ‘ ’ (U+2018/2019) inside a word are always wrong.
for (const [key, value] of uz) {
  if (/[a-zA-Z]['\u2018\u2019`][a-zA-Z]/.test(value)) problems.push(`wrong apostrophe inside a word at ${key}: ${value}`);
  if (/[^oOgG]\u02BB/.test(value)) problems.push(`ʻ (U+02BB) only follows o/g, at ${key}: ${value}`);
}

if (problems.length) {
  console.error(`i18n:check failed — ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  • ${p}`);
  process.exit(1);
}
console.log(`i18n:check ok — ${ru.size} keys, ru + uz in sync`);
