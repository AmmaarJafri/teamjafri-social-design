// cta: prominent logo, serif headline, optional body, accent action button, url.
import { CANVAS, DEFAULT_URL, SERIF } from '../tokens.js';
import { arrowSvg, blueprintSurfaceCss, esc, footer, header, laneTokens, logoUrl, page, textBox } from './shared.js';

export function renderCta(ctx) {
  const t = laneTokens(ctx);
  const { margin: M, footerZone: FZ } = CANVAS;
  const s = ctx.slide;
  const isCon = ctx.lane === 'construction';
  const hasBody = s.body != null && s.body !== '';
  const url = s.url ?? DEFAULT_URL;

  const btnShadow = isCon
    ? '0 0 0 1px rgba(255,143,154,.35), 0 20px 56px rgba(255,48,64,.40)'
    : '0 20px 48px rgba(184,18,27,.32)';

  const css = `
  ${isCon ? blueprintSurfaceCss : ''}
  .content{position:absolute;left:${M}px;right:${M}px;top:150px;bottom:${FZ + 48}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:3}
  .content>*{flex-shrink:0}
  .big-logo{display:block;height:160px;width:auto;margin-bottom:60px}
  .headline{width:100%;${textBox({ size: 80, lh: 1.08, lines: 3 })}font-family:${SERIF};font-weight:600;
    letter-spacing:-.01em;color:${t.text};text-wrap:balance}
  .body{width:100%;${textBox({ size: 36, lh: 1.4, lines: 3 })}margin-top:28px;font-weight:500;color:${t.textSoft};text-wrap:balance}
  .action{display:inline-flex;align-items:center;gap:18px;max-width:100%;height:108px;padding:0 52px;margin-top:56px;border-radius:12px;
    background:${t.accent};color:#fff;font-size:36px;font-weight:800;letter-spacing:.02em;white-space:nowrap;overflow:hidden;box-shadow:${btnShadow}}
  .action .arrow{flex:0 0 auto}
  .url{width:100%;height:48px;line-height:48px;margin-top:36px;font-size:34px;font-weight:700;letter-spacing:.06em;color:${t.accent};
    white-space:nowrap;overflow:hidden}
  `;

  const body = `
  ${isCon ? '<div class="bp-surface"></div>' : ''}
  ${header(ctx, { logoFile: null })}
  <main class="content">
    <img class="big-logo" alt="Team Jafri" src="${esc(logoUrl(ctx, t.logoFull))}">
    <h2 class="headline" data-fit="headline">${esc(s.headline)}</h2>
    ${hasBody ? `<p class="body" data-fit="body">${esc(s.body)}</p>` : ''}
    <div class="action" data-fit="action"><span>${esc(s.action)}</span>${arrowSvg('#fff')}</div>
    <div class="url" data-fit="url">${esc(url)}</div>
  </main>
  ${footer(ctx)}`;

  return page(ctx, { css, body });
}
