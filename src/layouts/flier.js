// flier: one-image promo post. Photo (or brand panel with a big logo) on top; headline, optional subhead,
// optional 2-4 bullets, then the same call/DM block as the cta slide; the lane footer (with phone) at the bottom.
// Every text box has a fixed maximum, and the maxima add up to less than the space below the top area's
// 390px minimum, so too much text always fails as overflow (exit 5) instead of colliding.
import { CANVAS, COLORS, PHOTO_LOGO, SERIF } from '../tokens.js';
import { blueprintSurfaceCss, callDmCss, callDmHtml, esc, footer, header, laneTokens, lineBox, logoUrl, page, textBox } from './shared.js';

export function renderFlier(ctx) {
  const t = laneTokens(ctx);
  const { margin: M, footerZone: FZ } = CANVAS;
  const s = ctx.slide;
  const isCon = ctx.lane === 'construction';
  const hasPhoto = s.image != null;
  const bullets = Array.isArray(s.bullets) ? s.bullets : [];

  const css = `
  ${isCon ? blueprintSurfaceCss : ''}
  .col{position:absolute;left:0;right:0;top:0;bottom:${FZ}px;display:flex;flex-direction:column;z-index:3}
  .top{position:relative;flex:1 1 auto;min-height:390px;overflow:hidden}
  .photo{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover;object-position:center}
  .scrim{position:absolute;inset:0;background:linear-gradient(180deg, rgba(10,7,8,.80) 0px, rgba(10,7,8,.45) 170px, rgba(10,7,8,0) 300px)}
  .edge{position:absolute;left:0;right:0;bottom:0;height:8px;background:${t.accent};${isCon ? 'box-shadow:0 0 22px rgba(255,48,64,.6);' : ''}}
  .panel{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding-top:40px;
    ${isCon ? '' : `background:${COLORS.paper2};`}}
  .panel-logo{display:block;height:200px;width:auto}
  .content{flex:0 0 auto;padding:40px ${M}px 32px}
  .content>*{flex-shrink:0}
  .headline{width:100%;${textBox({ size: 80, lh: 1.06, lines: 2 })}font-family:${SERIF};font-weight:600;
    letter-spacing:-.01em;color:${t.text};text-wrap:balance}
  .subhead{width:100%;${textBox({ size: 36, lh: 1.3, lines: 2 })}margin-top:18px;font-weight:500;color:${t.textSoft};text-wrap:pretty}
  .bullets{list-style:none;margin-top:28px;display:flex;flex-direction:column;gap:8px}
  .bullet{display:flex;align-items:center;gap:22px}
  .mark{flex:0 0 auto;width:14px;height:14px;background:${t.accent};${isCon ? 'box-shadow:0 0 12px rgba(255,48,64,.6);' : ''}}
  .bullet-text{flex:1 1 auto;min-width:0;${lineBox({ size: 34, line: 48 })}font-weight:600;color:${t.text}}
  ${callDmCss(ctx)}
  .action{margin-top:36px}
  `;

  const top = hasPhoto
    ? `<img class="photo" data-image="image" alt="" src="${esc(ctx.asset(s.image))}">
       <div class="scrim"></div><div class="edge"></div>`
    : `<div class="panel"><img class="panel-logo" alt="Team Jafri" src="${esc(logoUrl(ctx, t.logoFull))}"></div>`;

  const list = bullets.length
    ? `<ul class="bullets">${bullets
        .map((b, i) => `<li class="bullet"><span class="mark"></span><span class="bullet-text" data-fit="bullets[${i + 1}]">${esc(b)}</span></li>`)
        .join('')}</ul>`
    : '';

  const body = `
  ${isCon ? '<div class="bp-surface"></div>' : ''}
  <div class="col">
    <div class="top">${top}</div>
    <main class="content">
      <h1 class="headline" data-fit="headline">${esc(s.headline)}</h1>
      ${s.subhead ? `<p class="subhead" data-fit="subhead">${esc(s.subhead)}</p>` : ''}
      ${list}
      ${callDmHtml(ctx)}
    </main>
  </div>
  ${header(ctx, { logoFile: hasPhoto ? PHOTO_LOGO : null, logoHeight: 92 })}
  ${footer(ctx)}`;

  return page(ctx, { css, body });
}
