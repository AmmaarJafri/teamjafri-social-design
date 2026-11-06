// Spec validation. Runs fully before Chrome launches and collects EVERY problem.
// Returns { errors: [{code, msg}], warnings: [{code, msg}], spec, slides }
// where `slides` are copies of the spec slides with image fields resolved to absolute paths.
import fs from 'node:fs';
import path from 'node:path';
import { LAYOUTS } from './layouts/index.js';

export const CATEGORY = {
  1: 'INTERNAL',
  2: 'INVALID SPEC',
  3: 'FOOTER',
  4: 'IMAGE',
  5: 'TEXT OVERFLOW',
  6: 'ENVIRONMENT',
};

const LANE_FOOTER = {
  'real-estate': ['agentName', 'dre', 'brokerage'],
  construction: ['licensedName', 'cslb'],
};
const LICENSE_FORMAT = {
  dre: [/^\d{8}$/, 'exactly 8 digits'],
  cslb: [/^\d{6,7}$/, '6-7 digits'],
};
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

// Characters the bundled latin font subsets can draw.
const ALLOWED_CHAR = /^[ -~ -ÿ‐-‧‰-›€™]$/u;

// Word-bounded so real names like "Todorov" or "Sampson" don't trip it.
const PLACEHOLDER_WORDS =
  /\b(placeholder|tbd|todo|x{3,}|lorem|agent name|broker name|brokerage name|licensed name|license name|company name|business name|your name|name here|changeme|example|sample)\b|(^|[^a-z0-9])n\/a($|[^a-z0-9])/i;
const WRAPPED = /^\s*(\[[\s\S]*\]|\{[\s\S]*\}|<[\s\S]*>)\s*$/;

export function unsupportedChars(s) {
  return [...new Set([...s].filter((c) => !ALLOWED_CHAR.test(c)))];
}

function describeChar(c) {
  const cp = c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
  return `${JSON.stringify(c)} (U+${cp})`;
}

function isDummyLicense(s) {
  if (!/^\d{2,}$/.test(s)) return false;
  if (/^(\d)\1+$/.test(s)) return true; // 00000000, 1111111
  return [...s].every((d, i) => i === 0 || Number(d) === Number(s[i - 1]) + 1); // 12345678, 0123456
}

export function placeholderReason(field, value) {
  const m = value.match(PLACEHOLDER_WORDS);
  if (m) return `contains placeholder text "${m[0].trim()}"`;
  if (WRAPPED.test(value)) return 'is wrapped in brackets like a template slot';
  if (field in LICENSE_FORMAT && isDummyLicense(value.trim())) return 'is a dummy number (repeated digit or 1234... run)';
  return null;
}

const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';

export function validateSpec(specPath, { draft = false } = {}) {
  const errors = [];
  const warnings = [];
  const err = (code, msg) => errors.push({ code, msg });

  let spec;
  try {
    spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  } catch (e) {
    err(2, `cannot read spec ${specPath}: ${e.message}`);
    return { errors, warnings };
  }
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    err(2, 'spec must be a JSON object');
    return { errors, warnings };
  }
  const specDir = path.dirname(path.resolve(specPath));

  // --- lane + slides (exit 2) ---
  const lane = spec.lane;
  if (!Object.hasOwn(LANE_FOOTER, lane ?? '')) {
    err(2, `lane must be "real-estate" or "construction", got ${JSON.stringify(lane)}`);
  }
  const slidesIn = spec.slides;
  if (!Array.isArray(slidesIn) || slidesIn.length < 1 || slidesIn.length > 10) {
    err(2, `slides must be an array of 1-10 slides, got ${Array.isArray(slidesIn) ? `${slidesIn.length} slides` : JSON.stringify(slidesIn)}`);
  }

  const slides = [];
  for (const [i, slide] of (Array.isArray(slidesIn) ? slidesIn : []).entries()) {
    const n = i + 1;
    if (!slide || typeof slide !== 'object' || Array.isArray(slide)) {
      err(2, `slide ${n} must be an object`);
      continue;
    }
    const layout = slide.layout;
    if (typeof layout !== 'string' || !Object.hasOwn(LAYOUTS, layout)) {
      err(2, `slide ${n} has unknown layout ${JSON.stringify(layout)} (known: ${Object.keys(LAYOUTS).join(', ')})`);
      continue;
    }
    const label = `slide ${n} (${layout})`;
    const def = LAYOUTS[layout];
    const known = new Set(['layout', ...def.text.required, ...def.text.optional, ...def.images]);
    for (const key of Object.keys(slide)) {
      if (!known.has(key)) err(2, `${label} has unknown field '${key}' (allowed: ${[...known].join(', ')})`);
    }
    for (const field of def.text.required) {
      if (!isNonEmptyString(slide[field])) err(2, `${label} is missing required text field '${field}'`);
    }
    for (const field of [...def.text.required, ...def.text.optional]) {
      const v = slide[field];
      if (v === undefined) continue;
      if (typeof v !== 'string') {
        err(2, `${label} field '${field}' must be a string, got ${typeof v}`);
        continue;
      }
      for (const c of unsupportedChars(v)) {
        err(2, `${label} field '${field}' has unsupported character ${describeChar(c)}; the bundled fonts can't draw it`);
      }
    }

    // --- images (exit 4; wrong type is a spec error) ---
    const resolved = { ...slide };
    for (const field of def.images) {
      const v = slide[field];
      if (v === undefined || v === '') {
        err(4, `${label} is missing image field '${field}'`);
        continue;
      }
      if (typeof v !== 'string') {
        err(2, `${label} image field '${field}' must be a path string`);
        continue;
      }
      const abs = path.resolve(specDir, v);
      resolved[field] = abs;
      let stat = null;
      try { stat = fs.statSync(abs); } catch { /* missing */ }
      if (!stat) err(4, `${label} image '${field}' not found: ${abs}`);
      else if (!stat.isFile()) err(4, `${label} image '${field}' is not a regular file: ${abs}`);
      else if (!IMAGE_EXT.test(abs)) err(4, `${label} image '${field}' must be .jpg/.jpeg/.png/.webp: ${abs}`);
    }
    slides.push(resolved);
  }

  // --- footer (exit 3) ---
  const footer = spec.footer && typeof spec.footer === 'object' && !Array.isArray(spec.footer) ? spec.footer : {};
  for (const field of LANE_FOOTER[lane] ?? []) {
    const v = footer[field];
    if (!isNonEmptyString(v)) {
      err(3, `footer.${field} is ${v === undefined ? 'missing' : typeof v !== 'string' ? `not a string (${typeof v})` : 'empty'}; required for lane "${lane}"`);
      continue;
    }
    for (const c of unsupportedChars(v)) {
      err(3, `footer.${field} has unsupported character ${describeChar(c)}; the bundled fonts can't draw it`);
    }
    // Placeholder / format problems: hard fail, or warning in --draft.
    const soft = (msg) => (draft ? warnings : errors).push({ code: 3, msg });
    const reason = placeholderReason(field, v);
    if (reason) {
      soft(`footer.${field} ${JSON.stringify(v)} ${reason}`);
    } else if (field in LICENSE_FORMAT && !LICENSE_FORMAT[field][0].test(v)) {
      soft(`footer.${field} ${JSON.stringify(v)} has the wrong format: expected ${LICENSE_FORMAT[field][1]}`);
    }
  }

  return { errors, warnings, spec, slides, lane, footer };
}
