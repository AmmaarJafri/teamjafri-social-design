#!/usr/bin/env node
// node render.js <spec.json> [--out <dir>] [--draft]
// Exit codes: 0 ok, 1 internal, 2 invalid spec/usage, 3 footer, 4 image, 5 text overflow, 6 environment.
// No output on failure: PNGs land in <out> only if every slide passes; otherwise <out> is removed.
import fs from 'node:fs/promises';
import { readdirSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { validateSpec, CATEGORY } from './src/validate.js';
import { findChrome, renderSlides } from './src/render.js';
import { renderSlideHtml } from './src/layouts/index.js';

const USAGE = 'usage: node render.js <spec.json> [--out <dir>] [--draft]';
let outToClean = null; // set once we know the out dir is safe to delete

const line = (kind, { code, msg }) => `${kind} [${code} ${CATEGORY[code]}] ${msg}`;

function exitCodeFor(errors, order) {
  return order.find((c) => errors.some((e) => e.code === c)) ?? errors[0].code;
}

// Only ever delete a directory that holds nothing but PNGs we could have written.
function outDirProblem(dir) {
  let stat;
  try { stat = statSync(dir); } catch { return null; }
  if (!stat.isDirectory()) return `--out ${dir} exists and is not a directory`;
  const other = readdirSync(dir, { withFileTypes: true })
    .filter((e) => !(e.isFile() && /\.png$/i.test(e.name)) && e.name !== '.DS_Store');
  return other.length
    ? `refusing to replace --out ${dir}: it contains non-PNG entries (${other.slice(0, 3).map((e) => e.name).join(', ')}). Use an empty or PNG-only directory.`
    : null;
}

async function publish(pngs, outDir, draft) {
  const staging = `${outDir}.tmp-${process.pid}`;
  await fs.rm(staging, { recursive: true, force: true });
  await fs.mkdir(staging, { recursive: true });
  const finals = [];
  for (const [i, src] of pngs.entries()) {
    const name = `${draft ? 'DRAFT-' : ''}${String(i + 1).padStart(2, '0')}.png`;
    await fs.copyFile(src, path.join(staging, name)); // copy, not rename: tmpdir may be another filesystem
    finals.push(path.join(outDir, name));
  }
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.rename(staging, outDir);
  return finals;
}

async function failWith(errors, order) {
  for (const e of errors) console.error(line('FAIL', e));
  if (outToClean) await fs.rm(outToClean, { recursive: true, force: true });
  return exitCodeFor(errors, order);
}

async function main() {
  let values, positionals;
  try {
    ({ values, positionals } = parseArgs({
      allowPositionals: true,
      options: { out: { type: 'string' }, draft: { type: 'boolean', default: false } },
    }));
    if (positionals.length !== 1) throw new Error(`expected exactly one spec file, got ${positionals.length}`);
  } catch (e) {
    console.error(line('FAIL', { code: 2, msg: `${e.message}\n${USAGE}` }));
    return 2;
  }
  const specPath = path.resolve(positionals[0]);
  const draft = values.draft;
  const outDir = path.resolve(values.out ?? path.join('out', path.basename(specPath, '.json')));

  // 1. Validate everything before Chrome starts.
  const v = validateSpec(specPath, { draft });
  const outProblem = outDirProblem(outDir);
  if (outProblem) v.errors.unshift({ code: 2, msg: outProblem });
  else outToClean = outDir;
  for (const w of v.warnings) console.error(line('WARNING', w));
  if (v.errors.length) return failWith(v.errors, [2, 3, 4]);

  // 2. Render.
  const chrome = findChrome();
  if (chrome.error) return failWith([{ code: 6, msg: chrome.error }], [6]);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tj-render-'));
  try {
    const { errors, pngs } = await renderSlides({
      lane: v.lane, footer: v.footer, slides: v.slides, draft, workDir, chromePath: chrome.path, renderSlideHtml,
    });
    // Environment problems (fonts, network) make the other measurements meaningless, so they win.
    if (errors.length) return failWith(errors, [6, 3, 4, 5]);

    // 3. Publish atomically-ish: replace the out dir only after every slide passed.
    const finals = await publish(pngs, outDir, draft);
    for (const f of finals) console.log(f);
    console.log(`OK ${finals.length} slides -> ${outDir}`);
    return 0;
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

main().then(
  (code) => { process.exitCode = code; },
  async (e) => {
    console.error(line('FAIL', { code: 1, msg: 'unexpected internal error' }));
    console.error(e?.stack ?? e);
    if (outToClean) await fs.rm(outToClean, { recursive: true, force: true }).catch(() => {});
    process.exitCode = 1;
  },
);
