// point: one idea per slide on the lane surface. Optional giant stat, serif headline, optional body.
import { CANVAS, SERIF } from '../tokens.js';
import { blueprintSurfaceCss, esc, footer, header, laneTokens, lineBox, page, textBox } from './shared.js';

export function renderPoint(ctx) {
  const t = laneTokens(ctx);
  const { margin: M, footerZone: FZ } = CANVAS;
  const s = ctx.slide;
  const isCon = ctx.lane === 'construction';
  const hasStat = s.stat != null && s.stat !== '';
  const hasBody = s.body != null && s.body !== '';

  // With a stat the headline steps down so stat + headline + body always fit the content region.
  const hl = hasStat ? { size: 72, lh: 1.1, lines: 3 } : { size: 88, lh: 1.08, lines: 4 };

  const css = `
  ${isCon ? blueprintSurfaceCss : ''}
  .content{position:absolute;left:${M}px;right:${M}px;top:220px;bottom:${FZ + 56}px;display:flex;flex-direction:column;justify-content:center;z-index:3}
  .content>*{flex-shrink:0}
  .stat{width:100%;${lineBox({ size: 260, line: 250 })}font-weight:800;letter-spacing:-.045em;
    color:${t.accent};font-variant-numeric:lining-nums;
    ${isCon ? 'text-shadow:0 0 44px rgba(255,48,64,.45);' : ''}}
  .rule{width:96px;height:6px;background:${t.accent};margin-bottom:44px;${isCon ? 'box-shadow:0 0 18px rgba(255,48,64,.6);' : ''}}
  .headline{width:100%;${textBox(hl)}font-family:${SERIF};font-weight:600;
    letter-spacing:-.01em;color:${t.text};text-wrap:pretty;margin-top:${hasStat ? 24 : 0}px}
  .body{width:100%;${textBox({ size: 38, lh: 1.42, lines: 6 })}margin-top:36px;font-weight:500;color:${t.textSoft};text-wrap:pretty}
  `;

  const body = `
  ${isCon ? '<div class="bp-surface"></div>' : ''}
  ${header(ctx, { logoFile: t.logoFull, logoHeight: 92 })}
  <main class="content">
    ${hasStat ? `<div class="stat" data-fit="stat">${esc(s.stat)}</div>` : '<div class="rule"></div>'}
    <h2 class="headline" data-fit="headline">${esc(s.headline)}</h2>
    ${hasBody ? `<p class="body" data-fit="body">${esc(s.body)}</p>` : ''}
  </main>
  ${footer(ctx)}`;

  return page(ctx, { css, body });
}
