// End-to-end renders through real Chrome (CLI as a child process).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runCli, writeSpec, seedStaleOut, imageSize, renderedFooters, FIXTURES, tmpDir } from './helpers.js';

const LONG = Array.from({ length: 300 }, (_, i) => `word${i}`).join(' ');

function assertImages(out, names) {
  assert.deepEqual(fs.readdirSync(out).sort(), names);
  for (const n of names) assert.deepEqual(imageSize(path.join(out, n)), { width: 1080, height: 1350 }, n);
}

test('happy path (real-estate, relative image paths): N JPEGs at 1080x1350, stale out dir replaced', () => {
  const out = seedStaleOut(path.join(tmpDir(), 'out'));
  fs.writeFileSync(path.join(out, '01.png'), 'stale too');
  const r = runCli([path.join(FIXTURES, 'real-estate-valid.json'), '--out', out]);
  assert.equal(r.code, 0, r.stderr);
  assertImages(out, ['01.jpg', '02.jpg', '03.jpg', '04.jpg']);
  assert.match(r.stdout, /OK 4 slides -> /);
  assert.equal(r.stdout.trim().split('\n').length, 5);
});

test('happy path (construction) with default out dir = out/<spec name>/ under cwd', () => {
  const cwd = tmpDir();
  const r = runCli([path.join(FIXTURES, 'construction-valid.json')], { cwd });
  assert.equal(r.code, 0, r.stderr);
  assertImages(path.join(cwd, 'out', 'construction-valid'), ['01.jpg', '02.jpg']);
});

test('leading-zero DRE number passes validation and renders with the zero intact', async () => {
  const { file, out } = writeSpec('real-estate-valid.json', (s) => { s.footer.dre = '01928374'; });
  const r = runCli([file, '--out', out]);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.stderr, '', 'no warnings for a real-looking leading-zero DRE');
  assertImages(out, ['01.jpg', '02.jpg', '03.jpg', '04.jpg']);
  assert.deepEqual(await renderedFooters(file, '.ftr-license'), Array(4).fill('Dana Whitfield · CalDRE #01928374 · Valley Oak Realty'));
});

test('construction footer is the licensed name and CSLB # from the spec, nothing hardcoded', async () => {
  const { file } = writeSpec('construction-valid.json', (s) => { s.footer.licensedName = 'Okafor Construction Co'; });
  assert.deepEqual(await renderedFooters(file, '.ftr-license'), Array(2).fill('Okafor Construction Co · CSLB #1047293'));
});

test('--draft allows a placeholder footer (warning) and writes DRAFT-NN.jpg', () => {
  const { file, out } = writeSpec('real-estate-valid.json', (s) => { s.footer.dre = '00000000'; s.footer.agentName = 'TBD'; });
  const r = runCli([file, '--out', out, '--draft']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stderr, /WARNING \[3 FOOTER\] footer\.dre "00000000"/);
  assert.match(r.stderr, /WARNING \[3 FOOTER\] footer\.agentName "TBD"/);
  assertImages(out, ['DRAFT-01.jpg', 'DRAFT-02.jpg', 'DRAFT-03.jpg', 'DRAFT-04.jpg']);
});

test('--png writes 01.png… at 1080x1350 and replaces earlier JPEG output', () => {
  const out = path.join(tmpDir(), 'out');
  fs.mkdirSync(out);
  fs.writeFileSync(path.join(out, '01.jpg'), 'stale jpeg');
  const r = runCli([path.join(FIXTURES, 'construction-valid.json'), '--out', out, '--png']);
  assert.equal(r.code, 0, r.stderr);
  assertImages(out, ['01.png', '02.png']);
});

test('text overflow on cover AND point -> exit 5, both reported, no out dir', () => {
  const { file, out } = writeSpec('real-estate-valid.json', (s) => { s.slides[0].headline = LONG; s.slides[1].headline = LONG; });
  seedStaleOut(out);
  const r = runCli([file, '--out', out]);
  assert.equal(r.code, 5, r.stderr);
  assert.match(r.stderr, /FAIL \[5 TEXT OVERFLOW\] slide 1 \(cover\) field 'headline' overflows by \d+px tall/);
  assert.match(r.stderr, /FAIL \[5 TEXT OVERFLOW\] slide 2 \(point\) field 'headline' overflows by \d+px tall/);
  assert.equal(r.stdout, '');
  assert.equal(fs.existsSync(out), false);
});

test('cover photo narrower than 1080px -> exit 4 naming slide and actual width, no out dir', () => {
  const { file, out } = writeSpec('construction-valid.json', (s) => {
    s.slides[0].image = path.join(FIXTURES, '../../examples/photos/project-kitchen-refresh.jpg'); // 920px wide
  });
  seedStaleOut(out);
  const r = runCli([file, '--out', out]);
  assert.equal(r.code, 4, r.stderr);
  assert.match(r.stderr, /FAIL \[4 IMAGE\] slide 1 \(cover\) image 'image' is 920px wide; cover photos must be at least 1080px wide: .*project-kitchen-refresh\.jpg/);
  assert.equal(r.stdout, '');
  assert.equal(fs.existsSync(out), false);
});

test('Chrome missing -> exit 6, no out dir', () => {
  const { file, out } = writeSpec('construction-valid.json');
  seedStaleOut(out);
  const r = runCli([file, '--out', out], { env: { CHROME_PATH: '/nonexistent/chrome' } });
  assert.equal(r.code, 6, r.stderr);
  assert.match(r.stderr, /FAIL \[6 ENVIRONMENT\] CHROME_PATH is set to \/nonexistent\/chrome/);
  assert.equal(fs.existsSync(out), false);
});
