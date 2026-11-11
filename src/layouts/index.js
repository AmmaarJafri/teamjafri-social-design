// CONTRACT between layouts (src/layouts/, src/tokens.js) and the renderer (render.js, src/*.js).
// The exports, their shapes, and the rules below must not change without updating both sides.
// Layout implementations live next to this file (cover.js, point.js, before-after.js, cta.js);
// brand tokens live in src/tokens.js.
//
// Spec (one JSON file per carousel or flier; image paths are relative to the spec file's directory):
//   {
//     "lane": "real-estate" | "construction",
//     "footer": real-estate:  { "agentName": str, "dre": str, "brokerage": str, "phone": str }
//               construction: { "licensedName": str, "cslb": str, "phone": str }
//     "slides": [ { "layout": <key of LAYOUTS>, ...fields } ]   // 1..10 slides
//   }
//
// LAYOUTS[key] = { text: { required: [...], optional: [...] }, images: [...] }
//   - every name in `images` is a required image-path field, unless also listed in `optionalImages`
//   - optional minWidth: { <imageField>: px } = smallest allowed natural width of that photo (when present)
//   - optional lists: { <field>: { min, max } } = an array of min..max non-empty strings
//   - optional single: true = this layout must be the only slide in its spec
//   - optional ignored: { <field>: reason } = fields the layout no longer uses; accepted with a warning
//   - the renderer validates presence of required fields, rejects unknown fields,
//     checks image files exist, and resolves image paths to absolute paths before calling us.
//
// renderSlideHtml(ctx) -> complete HTML document string for ONE 1080x1350 slide.
//   ctx = {
//     lane,          // "real-estate" | "construction"
//     footer,        // validated footer object (shape above)
//     slide,         // the slide object; image fields already ABSOLUTE paths
//     index, total,  // 1-based slide number, slide count
//     asset(absPath) // -> URL string usable in src="" / url(); use for fonts, logos, photos
//     repoRoot,      // absolute path of the repo (for assets/fonts, assets/logo)
//     draft          // bool: when true, show a visible "DRAFT — NOT FOR POSTING" band
//   }
//
// Rules the renderer relies on:
//   1. Every element showing spec text has data-fit="<fieldName>" (footer: data-fit="footer";
//      list items: data-fit="<field>[n]", 1-based).
//      Each such element has a bounded box (fixed height or max-height) with overflow:hidden.
//      Single-line elements use white-space:nowrap. The renderer fails the run if any
//      [data-fit] element has scrollHeight > clientHeight + 1 or scrollWidth > clientWidth + 1.
//   2. Every slide carries the lane's license footer (data-fit="footer"), and that element contains
//      footer.phone. The renderer fails the slide (exit 3) if either is missing.
//   3. Only the bundled fonts (assets/fonts) are used, via @font-face pointing at asset(...).
//      No network URLs anywhere. body is exactly 1080x1350, margin 0.
//   4. Any image field listed in LAYOUTS[key].minWidth is drawn as <img data-image="<field>"> when present.
//      The renderer fails the run (exit 4) if that image's natural width is below the minimum.

import { renderCover } from './cover.js';
import { renderPoint } from './point.js';
import { renderBeforeAfter } from './before-after.js';
import { renderCta } from './cta.js';
import { renderFlier } from './flier.js';

export const LAYOUTS = {
  cover:          { text: { required: ['headline'], optional: ['kicker'] }, images: ['image'], minWidth: { image: 1080 } },
  point:          { text: { required: ['headline'], optional: ['stat', 'body'] }, images: [] },
  'before-after': { text: { required: ['headline'], optional: ['beforeLabel', 'afterLabel'] }, images: ['before', 'after'] },
  cta: {
    text: { required: ['headline'], optional: ['body'] }, images: [],
    ignored: {
      action: 'the CTA button is always "Call or text <footer.phone>"',
      url: 'the line under the CTA button is always "Or send us a DM"',
    },
  },
  // One-image promo post: offer/announcement + CTA, phone and website. Always a spec of its own.
  flier: {
    text: { required: ['headline', 'action'], optional: ['subhead', 'url'] },
    lists: { bullets: { min: 2, max: 4 } },
    images: ['image'], optionalImages: ['image'], minWidth: { image: 1080 },
    single: true,
  },
};

const RENDERERS = {
  cover: renderCover,
  point: renderPoint,
  'before-after': renderBeforeAfter,
  cta: renderCta,
  flier: renderFlier,
};

export function renderSlideHtml(ctx) {
  const render = RENDERERS[ctx.slide?.layout];
  if (!render) throw new Error(`Unknown layout: ${ctx.slide?.layout}`);
  if (ctx.lane !== 'real-estate' && ctx.lane !== 'construction') throw new Error(`Unknown lane: ${ctx.lane}`);
  return render(ctx);
}
