// cta: prominent logo, serif headline, optional body, "Call or text <phone>" button, "Or send us a DM" line.
// The button and the line are template copy; the phone comes from the spec's footer.phone.
import { CANVAS, SERIF } from '../tokens.js';
import { blueprintSurfaceCss, callDmCss, callDmHtml, esc, footer, header, laneTokens, logoUrl, page, textBox } from './shared.js';

export function renderCta(ctx) {
  const t = laneTokens(ctx);
  const { margin: M, footerZone: FZ } = CANVAS;
  const s = ctx.slide;
  const isCon = ctx.lane === 'construction';
  const hasBody = s.body != null && s.body !== '';

  const css = `
  ${isCon ? blueprintSurfaceCss : ''}
  .content{position:absolute;left:${M}px;right:${M}px;top:150px;bottom:${FZ + 48}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:3}
  .content>*{flex-shrink:0}
  .big-logo{display:block;height:160px;width:auto;margin-bottom:60px}
  .headline{width:100%;${textBox({ size: 80, lh: 1.08, lines: 3 })}font-family:${SERIF};font-weight:600;
    letter-spacing:-.01em;color:${t.text};text-wrap:balance}
  .body{width:100%;${textBox({ size: 36, lh: 1.4, lines: 3 })}margin-top:28px;font-weight:500;color:${t.textSoft};text-wrap:balance}
  ${callDmCss(ctx)}
  .action{margin-top:56px}
  `;

  const body = `
  ${isCon ? '<div class="bp-surface"></div>' : ''}
  ${header(ctx, { logoFile: null })}
  <main class="content">
    <img class="big-logo" alt="Team Jafri" src="${esc(logoUrl(ctx, t.logoFull))}">
    <h2 class="headline" data-fit="headline">${esc(s.headline)}</h2>
    ${hasBody ? `<p class="body" data-fit="body">${esc(s.body)}</p>` : ''}
    ${callDmHtml(ctx)}
  </main>
  ${footer(ctx)}`;

  return page(ctx, { css, body });
}
