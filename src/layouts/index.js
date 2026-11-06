// CONTRACT between layouts (src/layouts/, src/tokens.js) and the renderer (render.js, src/*.js).
// This file is a STUB. The layouts owner replaces the body of renderSlideHtml; the exports,
// their shapes, and the rules below must not change without updating both sides.
//
// Spec (one JSON file per carousel; image paths are relative to the spec file's directory):
//   {
//     "lane": "real-estate" | "construction",
//     "footer": real-estate:  { "agentName": str, "dre": str, "brokerage": str }
//               construction: { "cslb": str }
//     "slides": [ { "layout": <key of LAYOUTS>, ...fields } ]   // 1..10 slides
//   }
//
// LAYOUTS[key] = { text: { required: [...], optional: [...] }, images: [...] }
//   - every name in `images` is a required image-path field
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
//   1. Every element showing spec text has data-fit="<fieldName>" (footer: data-fit="footer").
//      Each such element has a bounded box (fixed height or max-height) with overflow:hidden.
//      Single-line elements use white-space:nowrap. The renderer fails the run if any
//      [data-fit] element has scrollHeight > clientHeight + 1 or scrollWidth > clientWidth + 1.
//   2. Every slide carries the lane's license footer (data-fit="footer").
//   3. Only the bundled fonts (assets/fonts) are used, via @font-face pointing at asset(...).
//      No network URLs anywhere. body is exactly 1080x1350, margin 0.

export const LAYOUTS = {
  cover:          { text: { required: ['headline'], optional: ['kicker'] }, images: ['image'] },
  point:          { text: { required: ['headline'], optional: ['stat', 'body'] }, images: [] },
  'before-after': { text: { required: ['headline'], optional: ['beforeLabel', 'afterLabel'] }, images: ['before', 'after'] },
  cta:            { text: { required: ['headline', 'action'], optional: ['body', 'url'] }, images: [] },
};

export function renderSlideHtml(ctx) {
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f = ctx.footer;
  const footer = ctx.lane === 'real-estate' ? `${f.agentName} · CalDRE #${f.dre} · ${f.brokerage}` : `CSLB #${f.cslb}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;width:1080px;height:1350px;background:#F7F4EF;font-family:sans-serif}
    .h{position:absolute;left:80px;top:200px;width:920px;height:400px;overflow:hidden;font-size:80px}
    .f{position:absolute;left:80px;bottom:40px;width:920px;height:40px;overflow:hidden;white-space:nowrap;font-size:26px}
  </style></head><body>
    <div class="h" data-fit="headline">${esc(ctx.slide.headline)}</div>
    <div class="f" data-fit="footer">${esc(footer)}</div>
  </body></html>`;
}
