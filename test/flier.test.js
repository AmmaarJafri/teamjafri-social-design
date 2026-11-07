// Flier: one 1080x1350 promo image per spec, with the same hard checks as the carousels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runCli, writeSpec, seedStaleOut, imageSize, renderedFooters, FIXTURES } from './helpers.js';

const RE = 'real-estate-flier-valid.json';
const CON = 'construction-flier-valid.json';
const LONG = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ');

function expectOneImage(r, out) {
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.stderr, '', 'no warnings for valid values');
  assert.deepEqual(fs.readdirSync(out), ['01.jpg']);
  assert.deepEqual(imageSize(path.join(out, '01.jpg')), { width: 1080, height: 1350 });
}

function expectFail(fixture, mutate, { code, match, args = [] }) {
  const { file, out } = writeSpec(fixture, mutate);
  seedStaleOut(out);
  const r = runCli([file, '--out', out, ...args]);
  assert.equal(r.code, code, `exit code\nstderr:\n${r.stderr}`);
  for (const m of [].concat(match)) assert.match(r.stderr, m);
  assert.equal(r.stdout, '', 'nothing on stdout on failure');
  assert.equal(fs.existsSync(out), false, 'out dir must not exist after a failure');
}

test('real-estate flier with photo -> one 1080x1350 JPEG', () => {
  const { file, out } = writeSpec(RE);
  expectOneImage(runCli([file, '--out', out]), out);
});

test('construction flier with photo -> one 1080x1350 JPEG', () => {
  const { file, out } = writeSpec(CON);
  expectOneImage(runCli([file, '--out', out]), out);
});

test('flier with no photo (brand panel) renders in both lanes', () => {
  for (const fixture of [RE, CON]) {
    const { file, out } = writeSpec(fixture, (s) => { delete s.slides[0].image; });
    expectOneImage(runCli([file, '--out', out]), out);
  }
});

test('flier photo narrower than 1080px -> exit 4 naming slide and actual width', () => {
  expectFail(CON, (s) => { s.slides[0].image = path.join(FIXTURES, '../../examples/photos/project-kitchen-refresh.jpg'); }, {
    code: 4,
    match: /FAIL \[4 IMAGE\] slide 1 \(flier\) image 'image' is 920px wide; flier photos must be at least 1080px wide: .*project-kitchen-refresh\.jpg/,
  });
});

test('flier photo path that does not exist -> exit 4', () => {
  expectFail(RE, (s) => { s.slides[0].image = '/nope/house.jpg'; }, { code: 4, match: /slide 1 \(flier\) image 'image' not found/ });
});

test('missing or empty phone -> exit 3 (both lanes, also under --draft)', () => {
  expectFail(RE, (s) => { delete s.footer.phone; }, { code: 3, match: /FAIL \[3 FOOTER\] footer\.phone is missing; required for a flier/ });
  expectFail(CON, (s) => { s.footer.phone = ' '; }, { code: 3, match: /footer\.phone is empty; required for a flier/ });
  expectFail(CON, (s) => { delete s.footer.phone; }, { code: 3, args: ['--draft'], match: /footer\.phone is missing/ });
});

for (const value of ['(209) 555-0100', '555-123-4567', '000-000-0000', '(123) 456-7890', 'TBD', '[phone]', 'XXX-XXX-XXXX']) {
  test(`placeholder phone ${JSON.stringify(value)} -> exit 3`, () => {
    expectFail(RE, (s) => { s.footer.phone = value; }, { code: 3, match: /FAIL \[3 FOOTER\] footer\.phone / });
  });
}

test('phone in the wrong format -> exit 3 with the expected format', () => {
  expectFail(CON, (s) => { s.footer.phone = '014-2753'; }, { code: 3, match: /footer\.phone "014-2753" has the wrong format: expected a US 10-digit number/ });
});

test('phone written as a JSON number -> exit 3 telling you to quote it', () => {
  expectFail(CON, (s) => { s.footer.phone = 2090142753; }, { code: 3, match: /footer\.phone is a number \(2090142753\); write it as a string in quotes/ });
});

test('--draft lets a placeholder phone through as a warning', () => {
  const { file, out } = writeSpec(CON, (s) => { s.footer.phone = '(209) 555-0100'; });
  const r = runCli([file, '--out', out, '--draft']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stderr, /WARNING \[3 FOOTER\] footer\.phone "\(209\) 555-0100" is a dummy number/);
  assert.deepEqual(fs.readdirSync(out), ['DRAFT-01.jpg']);
});

test('flier keeps the DRE leading zero, and shows the lane footer and phone exactly as written', async () => {
  const { file } = writeSpec(RE, (s) => { s.footer.dre = '01928374'; });
  assert.deepEqual(await renderedFooters(file), ['Dana Whitfield · CalDRE #01928374 · Valley Oak Realty']);
  assert.deepEqual(await renderedFooters(file, '[data-fit="phone"]'), ['(209) 014-2753']);
  const con = writeSpec(CON);
  assert.deepEqual(await renderedFooters(con.file), ['Rivera Builders Inc · CSLB #1047293']);
});

test('a flier must be the only slide in its spec -> exit 2', () => {
  expectFail(CON, (s) => { s.slides.push({ layout: 'point', headline: 'Another slide' }); }, {
    code: 2, match: /slide 1 \(flier\): a flier must be the only slide in its spec \(got 2 slides\)/,
  });
});

test('bullets must be a list of 2-4 non-empty strings -> exit 2', () => {
  expectFail(RE, (s) => { s.slides[0].bullets = ['Only one']; }, { code: 2, match: /field 'bullets' must be a list of 2-4 strings, got 1/ });
  expectFail(RE, (s) => { s.slides[0].bullets = ['a', 'b', 'c', 'd', 'e']; }, { code: 2, match: /got 5/ });
  expectFail(RE, (s) => { s.slides[0].bullets = 'not a list'; }, { code: 2, match: /got string/ });
  expectFail(RE, (s) => { s.slides[0].bullets = ['Fine', '']; }, { code: 2, match: /field 'bullets\[2\]' must be non-empty text/ });
  expectFail(RE, (s) => { s.slides[0].bullets = ['Fine', 'Emoji 🏡']; }, { code: 2, match: /field 'bullets\[2\]' has unsupported character/ });
});

test('missing headline or action -> exit 2', () => {
  expectFail(CON, (s) => { delete s.slides[0].headline; delete s.slides[0].action; }, {
    code: 2, match: [/slide 1 \(flier\) is missing required text field 'headline'/, /missing required text field 'action'/],
  });
});

test('too much text -> exit 5 naming the field, never a squeezed layout', () => {
  expectFail(RE, (s) => { s.slides[0].headline = LONG; }, { code: 5, match: /FAIL \[5 TEXT OVERFLOW\] slide 1 \(flier\) field 'headline' overflows/ });
  expectFail(CON, (s) => { s.slides[0].bullets[1] = 'A bullet that goes on far too long to fit on one line of this flier, by a lot'; }, {
    code: 5, match: /field 'bullets\[2\]' overflows by \d+px wide/,
  });
  expectFail(CON, (s) => { s.slides[0].action = 'Call us today to book a free on-site consultation and quote'; }, { code: 5, match: /field 'action' overflows/ });
});

test('the largest allowed content still fits: 2-line headline, 2-line subhead, 4 bullets, photo', () => {
  const { file, out } = writeSpec(CON, (s) => {
    Object.assign(s.slides[0], {
      headline: 'Garage-to-ADU conversions in Tracy',
      subhead: 'Free on-site consultation and a written, fixed-price quote. No obligation, no pressure.',
      bullets: ['Plans and permits handled for you', 'Fixed-price quote before work starts', 'Built to code, start to finish', 'Licensed, bonded and insured'],
      action: 'Book your free consult',
    });
  });
  expectOneImage(runCli([file, '--out', out]), out);
});
