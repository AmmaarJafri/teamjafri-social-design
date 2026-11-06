// before-after: serif headline over two stacked landscape photos, each tagged with a label pill.
import { CANVAS, COLORS, SERIF } from '../tokens.js';
import { blueprintSurfaceCss, cssUrl, esc, footer, header, laneTokens, page, textBox } from './shared.js';

export function renderBeforeAfter(ctx) {
  const t = laneTokens(ctx);
  const { margin: M, footerZone: FZ, radius: R } = CANVAS;
  const s = ctx.slide;
  const isCon = ctx.lane === 'construction';
  const beforeLabel = s.beforeLabel ?? 'Before';
  const afterLabel = s.afterLabel ?? 'After';

  const frame = isCon
    ? 'border:2px solid rgba(255,48,64,.55);box-shadow:0 0 0 1px rgba(0,0,0,.6), 0 0 36px rgba(255,48,64,.18)'
    : 'box-shadow:0 24px 60px rgba(16,14,12,.16)';

  const css = `
  ${isCon ? blueprintSurfaceCss : ''}
  .content{position:absolute;left:${M}px;right:${M}px;top:200px;bottom:${FZ + 48}px;display:flex;flex-direction:column;z-index:3}
  .headline{flex:0 0 auto;width:100%;${textBox({ size: 64, lh: 1.1, lines: 2 })}font-family:${SERIF};font-weight:600;
    letter-spacing:-.01em;color:${t.text};text-wrap:balance}
  .photos{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:22px;margin-top:36px}
  .shot{position:relative;flex:1 1 0;min-height:0;border-radius:${R}px;overflow:hidden;background:${COLORS.ink};${frame}}
  /* left edge bleeds 16px past the frame: trims thin crop artifacts on the photo's left edge */
  .shot .img{position:absolute;top:0;right:0;bottom:0;left:-16px;background-size:cover;background-position:center}
  .label{position:absolute;left:24px;top:24px;max-width:calc(100% - 48px);height:56px;line-height:56px;padding:0 24px;border-radius:999px;
    font-size:26px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;white-space:nowrap;overflow:hidden;color:#fff}
  .label.before{background:rgba(10,7,8,.80);box-shadow:0 10px 28px rgba(0,0,0,.25)}
  .label.after{background:${t.accent};box-shadow:0 10px 28px rgba(${isCon ? '255,48,64' : '184,18,27'},.38)}
  `;

  const body = `
  ${isCon ? '<div class="bp-surface"></div>' : ''}
  ${header(ctx, { logoFile: t.logoFull, logoHeight: 92 })}
  <main class="content">
    <h2 class="headline" data-fit="headline">${esc(s.headline)}</h2>
    <div class="photos">
      <div class="shot"><div class="img" style="background-image:${esc(cssUrl(ctx.asset(s.before)))}"></div>
        <div class="label before" data-fit="beforeLabel">${esc(beforeLabel)}</div></div>
      <div class="shot"><div class="img" style="background-image:${esc(cssUrl(ctx.asset(s.after)))}"></div>
        <div class="label after" data-fit="afterLabel">${esc(afterLabel)}</div></div>
    </div>
  </main>
  ${footer(ctx)}`;

  return page(ctx, { css, body });
}
