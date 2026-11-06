// Renderer checks that layouts can trip, exercised with fake layouts (one Chrome launch).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderSlides, findChrome, REPO_ROOT } from '../src/render.js';
import { tmpDir } from './helpers.js';

const FOOTER = '<div data-fit="footer" style="height:40px;overflow:hidden">CSLB #1047293</div>';
const page = (body, head = '') => `<!doctype html><html><head><meta charset="utf-8">${head}</head><body style="margin:0">${body}</body></html>`;
const fontUrl = pathToFileURL(path.join(REPO_ROOT, 'assets/fonts/manrope-latin-700-normal.woff2')).href;

const FAKE = {
  ok: () => page(`<div data-fit="headline" style="font:700 40px Manrope;height:60px;overflow:hidden">Fine</div>${FOOTER}`,
    `<style>@font-face{font-family:Manrope;font-weight:700;src:url(${fontUrl})} body{font:700 26px Manrope}</style>`),
  network: () => page(`<img src="https://example.com/x.png">${FOOTER}`),
  nofooter: () => page('<div data-fit="headline">No footer here</div>'),
  badfont: () => page(`<div data-fit="headline" style="font-family:Broken">x</div>${FOOTER}`,
    '<style>@font-face{font-family:Broken;src:url(file:///nonexistent/font.woff2)}</style>'),
  badimg: () => page(`<img src="${pathToFileURL(path.join(REPO_ROOT, 'package.json')).href}">${FOOTER}`),
  wide: () => page(`<div data-fit="stat" style="width:100px;height:40px;overflow:hidden;white-space:nowrap">${'W'.repeat(80)}</div>${FOOTER}`),
};

test('renderer flags network access, missing footer, broken fonts, broken images, horizontal overflow', async () => {
  const chrome = findChrome();
  assert.ok(chrome.path, chrome.error);
  const slides = Object.keys(FAKE).map((layout) => ({ layout }));
  const workDir = tmpDir();
  const { errors, images } = await renderSlides({
    lane: 'construction', footer: { cslb: '1047293' }, slides, draft: false, workDir, chromePath: chrome.path,
    renderSlideHtml: (ctx) => FAKE[ctx.slide.layout](ctx),
  });
  const msgs = errors.map((e) => `${e.code} ${e.msg}`);
  const has = (re) => assert.ok(msgs.some((m) => re.test(m)), `expected ${re} in:\n${msgs.join('\n')}`);
  assert.ok(!msgs.some((m) => m.includes('slide 1 (ok)')), `slide 1 should be clean:\n${msgs.join('\n')}`);
  has(/^6 slide 2 \(network\) tried to load a network URL \(blocked\): https:\/\/example\.com\/x\.png/);
  has(/^3 slide 3 \(nofooter\) has no \[data-fit="footer"\] element/);
  has(/^6 slide 4 \(badfont\) font "Broken" .* did not load/);
  has(/^4 slide 5 \(badimg\) image did not load/);
  has(/^5 slide 6 \(wide\) field 'stat' overflows by \d+px wide/);
  assert.equal(images.length, slides.length);
  fs.rmSync(workDir, { recursive: true, force: true });
});
