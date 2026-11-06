// Validation-phase hard fails: every one must exit non-zero BEFORE Chrome and leave no out dir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runCli, writeSpec, seedStaleOut, REPO } from './helpers.js';

function expectFail(fixture, mutate, { code, match, args = [] }) {
  const { file, out } = writeSpec(fixture, mutate);
  seedStaleOut(out);
  const r = runCli([file, '--out', out, ...args]);
  assert.equal(r.code, code, `exit code\nstderr:\n${r.stderr}`);
  for (const m of [].concat(match)) assert.match(r.stderr, m);
  assert.equal(r.stdout, '', 'nothing on stdout on failure');
  assert.equal(fs.existsSync(out), false, 'out dir must not exist after a failure');
  return r;
}

const RE = 'real-estate-valid.json';
const CON = 'construction-valid.json';

test('missing footer field (real-estate) -> exit 3', () => {
  expectFail(RE, (s) => { delete s.footer.dre; }, { code: 3, match: /FAIL \[3 FOOTER\] footer\.dre is missing/ });
});

test('missing footer field (construction) -> exit 3', () => {
  expectFail(CON, (s) => { delete s.footer.cslb; }, { code: 3, match: /FAIL \[3 FOOTER\] footer\.cslb is missing/ });
});

test('empty footer field -> exit 3', () => {
  expectFail(RE, (s) => { s.footer.agentName = '  '; }, { code: 3, match: /footer\.agentName is empty/ });
});

test('all missing footer fields are reported together', () => {
  expectFail(RE, (s) => { s.footer = {}; }, { code: 3, match: [/footer\.agentName/, /footer\.dre/, /footer\.brokerage/] });
});

for (const [field, value] of [
  ['dre', '00000000'], ['dre', 'TBD'], ['dre', '12345678'], ['agentName', 'Agent Name'], ['agentName', '[Your Name]'],
  ['brokerage', 'Lorem Ipsum Realty'], ['brokerage', 'n/a'], ['agentName', 'XXXX'], ['brokerage', '{brokerage}'],
]) {
  test(`placeholder footer ${field}=${JSON.stringify(value)} -> exit 3`, () => {
    expectFail(RE, (s) => { s.footer[field] = value; }, { code: 3, match: new RegExp(`FAIL \\[3 FOOTER\\] footer\\.${field} `) });
  });
}

test('placeholder construction cslb "1111111" -> exit 3', () => {
  expectFail(CON, (s) => { s.footer.cslb = '1111111'; }, { code: 3, match: /footer\.cslb "1111111" is a dummy number/ });
});

test('bad license format -> exit 3 with expected format', () => {
  expectFail(RE, (s) => { s.footer.dre = '0192837'; }, { code: 3, match: /footer\.dre "0192837" has the wrong format: expected exactly 8 digits/ });
  expectFail(CON, (s) => { s.footer.cslb = '10472'; }, { code: 3, match: /footer\.cslb "10472" has the wrong format: expected 6-7 digits/ });
  expectFail(CON, (s) => { s.footer.cslb = 'B-1047293'; }, { code: 3, match: /expected 6-7 digits/ });
});

test('real names that contain placeholder-ish substrings are not flagged', async () => {
  const { placeholderReason } = await import('../src/validate.js');
  for (const v of ['Todd Todorov', 'Sampson Homes', 'Exampleton Realty', 'Nadia Khan']) {
    assert.equal(placeholderReason('agentName', v), null, v);
  }
});

test('--draft still fails on a missing footer field', () => {
  expectFail(RE, (s) => { delete s.footer.brokerage; }, { code: 3, args: ['--draft'], match: /footer\.brokerage is missing/ });
});

test('image path that does not exist -> exit 4, every missing path listed', () => {
  expectFail(RE, (s) => {
    s.slides[0].image = '/nope/missing-cover.jpg';
    s.slides[2].after = 'also-missing.png';
  }, { code: 4, match: [/FAIL \[4 IMAGE\] slide 1 \(cover\) image 'image' not found: \/nope\/missing-cover\.jpg/, /slide 3 \(before-after\) image 'after' not found: .*also-missing\.png/] });
});

test('image with unsupported extension -> exit 4', () => {
  expectFail(RE, (s) => { s.slides[0].image = path.join(REPO, 'package.json'); }, { code: 4, match: /must be \.jpg\/\.jpeg\/\.png\/\.webp/ });
});

test('unsupported character (emoji) -> exit 2 naming slide, field and char', () => {
  expectFail(RE, (s) => { s.slides[1].headline = 'Room to grow 🏡'; }, { code: 2, match: /FAIL \[2 INVALID SPEC\] slide 2 \(point\) field 'headline' has unsupported character "🏡" \(U\+1F3E1\)/ });
});

test('unknown layout -> exit 2', () => {
  expectFail(RE, (s) => { s.slides[1].layout = 'carousel-magic'; }, { code: 2, match: /slide 2 has unknown layout "carousel-magic"/ });
});

test('unknown slide field, missing required text, non-string text -> exit 2, all reported', () => {
  expectFail(CON, (s) => {
    s.slides[0].subtitle = 'x';
    delete s.slides[1].action;
    s.slides[0].headline = 42;
  }, { code: 2, match: [/slide 1 \(cover\) has unknown field 'subtitle'/, /slide 2 \(cta\) is missing required text field 'action'/, /slide 1 \(cover\) field 'headline' must be a string/] });
});

test('bad lane / slide count -> exit 2', () => {
  expectFail(CON, (s) => { s.lane = 'retail'; }, { code: 2, match: /lane must be "real-estate" or "construction"/ });
  expectFail(CON, (s) => { s.slides = []; }, { code: 2, match: /slides must be an array of 1-10 slides/ });
  expectFail(CON, (s) => { s.slides = Array(11).fill(s.slides[1]); }, { code: 2, match: /got 11 slides/ });
});

test('exit code follows category order 2 > 3 > 4 when several fail', () => {
  const r = expectFail(RE, (s) => {
    s.slides[0].image = '/nope.jpg';
    s.footer.dre = 'TBD';
    s.slides[1].layout = 'nope';
  }, { code: 2, match: [/\[2 INVALID SPEC\]/, /\[3 FOOTER\]/, /\[4 IMAGE\]/] });
  assert.ok(r.stderr.split('\n').filter(Boolean).length >= 3);
});

test('usage errors -> exit 2', () => {
  assert.equal(runCli([]).code, 2);
  assert.equal(runCli(['a.json', 'b.json']).code, 2);
  assert.equal(runCli(['a.json', '--bogus']).code, 2);
  const r = runCli(['/does/not/exist.json']);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /cannot read spec/);
});

test('invalid JSON -> exit 2', () => {
  const { file, out } = writeSpec(CON);
  fs.writeFileSync(file, '{ "lane": ');
  const r = runCli([file, '--out', out]);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /cannot read spec .*JSON/);
});

test('refuses to wipe an --out dir that holds non-image files', () => {
  const { file, dir } = writeSpec(CON);
  const r = runCli([file, '--out', dir]); // dir contains spec.json
  assert.equal(r.code, 2);
  assert.match(r.stderr, /refusing to replace --out/);
  assert.ok(fs.existsSync(file), 'spec must survive');
});
