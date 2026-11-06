// End-to-end renders through real Chrome (CLI as a child process).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runCli, writeSpec, seedStaleOut, pngSize, FIXTURES, tmpDir } from './helpers.js';

const LONG = Array.from({ length: 300 }, (_, i) => `word${i}`).join(' ');

function assertPngs(out, names) {
  assert.deepEqual(fs.readdirSync(out).sort(), names);
  for (const n of names) assert.deepEqual(pngSize(path.join(out, n)), { width: 1080, height: 1350 }, n);
}

test('happy path (real-estate, relative image paths): N PNGs at 1080x1350, stale out dir replaced', () => {
  const out = seedStaleOut(path.join(tmpDir(), 'out'));
  fs.writeFileSync(path.join(out, '01.png'), 'stale too');
  const r = runCli([path.join(FIXTURES, 'real-estate-valid.json'), '--out', out]);
  assert.equal(r.code, 0, r.stderr);
  assertPngs(out, ['01.png', '02.png', '03.png', '04.png']);
  assert.match(r.stdout, /OK 4 slides -> /);
  assert.equal(r.stdout.trim().split('\n').length, 5);
});

test('happy path (construction) with default out dir = out/<spec name>/ under cwd', () => {
  const cwd = tmpDir();
  const r = runCli([path.join(FIXTURES, 'construction-valid.json')], { cwd });
  assert.equal(r.code, 0, r.stderr);
  assertPngs(path.join(cwd, 'out', 'construction-valid'), ['01.png', '02.png']);
});

test('--draft allows a placeholder footer (warning) and writes DRAFT-NN.png', () => {
  const { file, out } = writeSpec('real-estate-valid.json', (s) => { s.footer.dre = '00000000'; s.footer.agentName = 'TBD'; });
  const r = runCli([file, '--out', out, '--draft']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stderr, /WARNING \[3 FOOTER\] footer\.dre "00000000"/);
  assert.match(r.stderr, /WARNING \[3 FOOTER\] footer\.agentName "TBD"/);
  assertPngs(out, ['DRAFT-01.png', 'DRAFT-02.png', 'DRAFT-03.png', 'DRAFT-04.png']);
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
