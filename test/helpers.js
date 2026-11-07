// Shared test helpers: run the CLI as a child process and build spec variants.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { LAYOUTS, renderSlideHtml } from '../src/layouts/index.js';
import { findChrome, REPO_ROOT } from '../src/render.js';
import { validateSpec } from '../src/validate.js';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FIXTURES = path.join(REPO, 'test', 'fixtures');

export function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tj-test-'));
}

export function runCli(args, { cwd = tmpDir(), env = {} } = {}) {
  const r = spawnSync(process.execPath, [path.join(REPO, 'render.js'), ...args], {
    cwd, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 180_000,
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, cwd };
}

export function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, name), 'utf8'));
}

// Write a (mutated) fixture into a temp dir. Image paths are made absolute so the copy still resolves.
export function writeSpec(fixtureName, mutate = () => {}) {
  const spec = loadFixture(fixtureName);
  for (const slide of spec.slides) {
    for (const field of LAYOUTS[slide.layout]?.images ?? []) {
      if (typeof slide[field] === 'string') slide[field] = path.resolve(FIXTURES, slide[field]);
    }
  }
  mutate(spec);
  const dir = tmpDir();
  const file = path.join(dir, 'spec.json');
  fs.writeFileSync(file, JSON.stringify(spec, null, 2));
  return { file, dir, out: path.join(dir, 'out') };
}

// An out dir pre-seeded with a stale PNG, so "out dir doesn't exist afterwards" proves deletion.
export function seedStaleOut(out) {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, '09.png'), 'stale');
  return out;
}

export function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString('latin1', 1, 4) !== 'PNG' || b.toString('latin1', 12, 16) !== 'IHDR') throw new Error(`${file} is not a PNG`);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

// Width/height from the JPEG's SOF0/SOF2 frame header.
export function jpegSize(file) {
  const b = fs.readFileSync(file);
  if (b[0] !== 0xff || b[1] !== 0xd8) throw new Error(`${file} is not a JPEG`);
  for (let i = 2; i + 9 < b.length;) {
    if (b[i] !== 0xff) throw new Error(`${file}: bad JPEG marker at ${i}`);
    const marker = b[i + 1];
    if (marker === 0xc0 || marker === 0xc2) return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error(`${file}: no JPEG frame header found`);
}

export function imageSize(file) {
  return /\.jpe?g$/i.test(file) ? jpegSize(file) : pngSize(file);
}

// The text of `selector` (default: the license footer) exactly as Chrome lays it out on each slide of a spec.
export async function renderedFooters(specFile, selector = '[data-fit="footer"]') {
  const v = validateSpec(specFile);
  assert.deepEqual(v.errors, []);
  const browser = await chromium.launch({ executablePath: findChrome().path, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const footers = [];
    for (const [i, slide] of v.slides.entries()) {
      const file = path.join(tmpDir(), 'slide.html');
      fs.writeFileSync(file, renderSlideHtml({
        lane: v.lane, footer: v.footer, slide, index: i + 1, total: v.slides.length, draft: false,
        asset: (p) => pathToFileURL(p).href, repoRoot: REPO_ROOT,
      }));
      await page.goto(pathToFileURL(file).href);
      footers.push(await page.locator(selector).innerText());
    }
    return footers;
  } finally {
    await browser.close();
  }
}
