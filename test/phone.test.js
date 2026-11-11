// Phone number: one value (footer.phone, from the Brand Brief) shown in every footer and on the CTA button.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runCli, writeSpec, seedStaleOut, renderedFooters, REPO } from './helpers.js';

const RE = 'real-estate-valid.json'; // cover, point, before-after, cta
const CON = 'construction-valid.json'; // cover, cta
const allLayouts = (s) => {
  s.slides.splice(1, 0,
    { layout: 'point', stat: '3', headline: 'Permits, plans, build' },
    { layout: 'before-after', headline: 'Boarded up to move-in ready', before: path.join(REPO, 'examples/photos/remodel-before.jpg'), after: path.join(REPO, 'examples/photos/remodel-after.jpg') });
};

function expectFail(fixture, mutate, { code, match }) {
  const { file, out } = writeSpec(fixture, mutate);
  seedStaleOut(out);
  const r = runCli([file, '--out', out]);
  assert.equal(r.code, code, `exit code\nstderr:\n${r.stderr}`);
  for (const m of [].concat(match)) assert.match(r.stderr, m);
  assert.equal(fs.existsSync(out), false, 'out dir must not exist after a failure');
}

test('every layout in both lanes, and the fliers, render with the phone in the footer', async () => {
  const specs = [
    [writeSpec(RE), '(209) 014-2753', 4],
    [writeSpec(CON, allLayouts), '209-014-2753', 4],
    [writeSpec('real-estate-flier-valid.json'), '(209) 014-2753', 1],
    [writeSpec('construction-flier-valid.json'), '209-014-2753', 1],
  ];
  for (const [{ file, out }, phone, n] of specs) {
    const r = runCli([file, '--out', out]); // the renderer itself fails any slide whose footer lacks the phone
    assert.equal(r.code, 0, r.stderr);
    assert.equal(fs.readdirSync(out).length, n);
    assert.deepEqual(await renderedFooters(file, '.ftr-phone'), Array(n).fill(phone), file);
    for (const text of await renderedFooters(file)) assert.ok(text.includes(phone), `footer "${text}" lacks ${phone}`);
  }
});

test('carousel spec without a phone -> exit 3 in both lanes, no output', () => {
  expectFail(RE, (s) => { delete s.footer.phone; }, { code: 3, match: /FAIL \[3 FOOTER\] footer\.phone is missing; required for lane "real-estate"/ });
  expectFail(CON, (s) => { delete s.footer.phone; }, { code: 3, match: /FAIL \[3 FOOTER\] footer\.phone is missing; required for lane "construction"/ });
  expectFail(CON, (s) => { s.footer.phone = '(209) 555-0100'; }, { code: 3, match: /footer\.phone "\(209\) 555-0100" is a dummy number/ });
  expectFail(RE, (s) => { s.footer.phone = 2090142753; }, { code: 3, match: /footer\.phone is a number \(2090142753\); write it as a string in quotes/ });
});

test('CTA slide: "Call or text <phone>" button and "Or send us a DM" line, in both lanes', async () => {
  for (const [fixture, phone] of [[RE, '(209) 014-2753'], [CON, '209-014-2753']]) {
    const { file } = writeSpec(fixture, (s) => { s.slides = s.slides.filter((x) => x.layout === 'cta'); });
    assert.deepEqual(await renderedFooters(file, '[data-fit="cta-button"]'), [`Call or text ${phone}`]);
    assert.deepEqual(await renderedFooters(file, '[data-fit="cta-line"]'), ['Or send us a DM']);
  }
});

test('changing footer.phone changes every footer and the CTA button: one source', async () => {
  const { file } = writeSpec(RE, (s) => { s.footer.phone = '209-016-4418'; });
  assert.deepEqual(await renderedFooters(file, '.ftr-phone'), Array(4).fill('209-016-4418'));
  const cta = writeSpec(RE, (s) => { s.footer.phone = '209-016-4418'; s.slides = s.slides.filter((x) => x.layout === 'cta'); });
  assert.deepEqual(await renderedFooters(cta.file, '[data-fit="cta-button"]'), ['Call or text 209-016-4418']);
});

test('CTA slide that still sends action/url renders, warns, and ignores them', async () => {
  const { file, out } = writeSpec(CON, (s) => { Object.assign(s.slides[1], { action: 'Use the form at teamjafri.com', url: 'teamjafri.com' }); });
  const r = runCli([file, '--out', out]);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stderr, /WARNING \[2 INVALID SPEC\] slide 2 \(cta\) field 'action' is ignored: the CTA button is always "Call or text <footer\.phone>"\. Remove it from the spec\./);
  assert.match(r.stderr, /WARNING \[2 INVALID SPEC\] slide 2 \(cta\) field 'url' is ignored: the line under the CTA button is always "Or send us a DM"/);
  assert.deepEqual(fs.readdirSync(out), ['01.jpg', '02.jpg']);
  const ctaOnly = writeSpec(CON, (s) => { s.slides = [{ ...s.slides[1], action: 'Use the form at teamjafri.com', url: 'teamjafri.com' }]; });
  assert.deepEqual(await renderedFooters(ctaOnly.file, '[data-fit="cta-button"]'), ['Call or text 209-014-2753']);
});
