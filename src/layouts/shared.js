// Shared building blocks for every layout: document shell, fonts, header, footer, draft band.
import path from 'node:path';
import { CANVAS, COLORS, DRAFT_TEXT, FONT_FACES, LANES, SANS, SERIF, footerText } from '../tokens.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const laneTokens = (ctx) => LANES[ctx.lane];

export const fontUrl = (ctx, file) => ctx.asset(path.join(ctx.repoRoot, 'assets', 'fonts', file));
export const logoUrl = (ctx, file) => ctx.asset(path.join(ctx.repoRoot, 'assets', 'logo', file));
// CSS url("...") value; asset URLs are file:// or http:// URLs, but quote/escape defensively.
export const cssUrl = (u) => `url("${String(u).replace(/["\\\n]/g, (c) => '\\' + c)}")`;

const pad2 = (n) => String(n).padStart(2, '0');

function fontFaceCss(ctx) {
  return FONT_FACES.map(
    (f) =>
      `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};font-display:block;src:${cssUrl(fontUrl(ctx, f.file))} format('woff2');}`,
  ).join('\n');
}

// Blueprint grid used on construction surfaces (site: .construction-hero::before + radial signal glow).
export const blueprintSurfaceCss = `
  .bp-surface{position:absolute;inset:0;background:
      radial-gradient(circle at 84% 8%, rgba(255,48,64,.17), transparent 38%),
      linear-gradient(135deg, ${COLORS.char} 0%, #121215 58%, ${COLORS.char2} 100%);}
  .bp-surface::before{content:"";position:absolute;inset:0;opacity:.5;
      background:
        linear-gradient(rgba(255,255,255,.10) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.10) 1px, transparent 1px);
      background-size:72px 72px;background-position:-1px -1px;
      -webkit-mask-image:linear-gradient(180deg, #000 0%, rgba(0,0,0,.55) 70%, rgba(0,0,0,.25) 100%);
              mask-image:linear-gradient(180deg, #000 0%, rgba(0,0,0,.55) 70%, rgba(0,0,0,.25) 100%);}
`;

// Small right-arrow used in buttons (the latin font subset has no arrow glyph).
export const arrowSvg = (color) =>
  `<svg class="arrow" viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Header row: logo (left) + slide counter (right). onPhoto = sits over a photo scrim.
export function header(ctx, { logoFile, logoHeight = 92, counterColor }) {
  const t = laneTokens(ctx);
  const counter =
    ctx.total > 1
      ? `<div class="counter" style="color:${counterColor || t.muted}">${pad2(ctx.index)}<span class="counter-sep">/</span>${pad2(ctx.total)}</div>`
      : '';
  const logo = logoFile ? `<img class="logo" alt="Team Jafri" src="${esc(logoUrl(ctx, logoFile))}" style="height:${logoHeight}px">` : '<span></span>';
  return `<header class="hdr">${logo}${counter}</header>`;
}

export function footer(ctx, { color, rule } = {}) {
  const t = laneTokens(ctx);
  return `<footer class="ftr" style="border-top-color:${rule || t.hairline}">
    <div class="ftr-text" data-fit="footer" style="color:${color || t.muted}">${esc(footerText(ctx.lane, ctx.footer))}</div>
  </footer>`;
}

function draftBand(ctx) {
  if (!ctx.draft) return '';
  return `<div class="draft-band" aria-label="draft">${esc(DRAFT_TEXT)}</div>`;
}

// Wrap a layout's body in the full 1080x1350 document.
export function page(ctx, { css = '', body = '', bg }) {
  const t = laneTokens(ctx);
  const { width: W, height: H, margin: M, top: TOP, footerZone: FZ, draftBand: DB } = CANVAS;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=${W}, height=${H}">
<style>
${fontFaceCss(ctx)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;margin:0;overflow:hidden}
body{position:relative;background:${bg || t.surface};color:${t.text};font-family:${SANS};
  -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;font-kerning:normal}
.serif{font-family:${SERIF}}
.hdr{position:absolute;left:${M}px;right:${M}px;top:${TOP}px;height:110px;display:flex;align-items:flex-start;justify-content:space-between;z-index:5}
.logo{display:block;width:auto}
.counter{font-family:${SANS};font-weight:700;font-size:26px;line-height:1;letter-spacing:.12em;padding-top:8px;font-variant-numeric:tabular-nums;white-space:nowrap}
.counter-sep{opacity:.55;margin:0 .35em}
.ftr{position:absolute;left:${M}px;right:${M}px;bottom:0;height:${FZ}px;border-top:1.5px solid;display:flex;align-items:center;z-index:5}
.ftr-text{width:100%;height:40px;line-height:40px;font-size:26px;font-weight:600;letter-spacing:.01em;white-space:nowrap;overflow:hidden}
.draft-band{position:absolute;left:0;right:0;top:0;height:${DB}px;z-index:100;display:flex;align-items:center;justify-content:center;
  background:repeating-linear-gradient(-45deg, ${COLORS.red} 0 28px, ${COLORS.redDark} 28px 56px);
  color:#fff;font-family:${SANS};font-weight:800;font-size:28px;letter-spacing:.22em;text-transform:uppercase;white-space:nowrap;
  box-shadow:0 2px 0 rgba(0,0,0,.25)}
${css}
</style></head>
<body class="lane-${esc(ctx.lane)}">
${body}
${draftBand(ctx)}
</body></html>`;
}

// Bounded text box for multi-line spec text. Fixed type size, at most `lines` lines; more = overflow.
// Manrope and Noto Serif both have ~1.37em font metrics, so with tight line-heights the last line's
// glyph box pokes below the line box and Chrome counts it in scrollHeight. A padding-bottom absorbs
// that (offset by an equal negative margin so spacing is unchanged); one extra line still overflows.
export const FONT_METRIC = 1.37;
export function textBox({ size, lh, lines }) {
  const line = size * lh;
  const pad = Math.max(0, Math.ceil((FONT_METRIC * size - line) / 2) + 1);
  const max = Math.ceil(line * lines) + pad + 2;
  return `font-size:${size}px;line-height:${lh};max-height:${max}px;padding-bottom:${pad}px;margin-bottom:-${pad}px;overflow:hidden;`;
}
// Single-line box with a fixed pixel line height (nowrap; overflow shows up as scrollWidth).
export function lineBox({ size, line }) {
  const pad = Math.max(0, Math.ceil((FONT_METRIC * size - line) / 2) + 1);
  return `font-size:${size}px;line-height:${line}px;height:${line + pad}px;padding-bottom:${pad}px;margin-bottom:-${pad}px;white-space:nowrap;overflow:hidden;`;
}
