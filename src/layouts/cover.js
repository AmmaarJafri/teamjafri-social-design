// cover: full-bleed photo + scrim, optional kicker, big serif headline, dark logo. The scroll-stopper.
import { CANVAS, COLORS, PHOTO_LOGO, SERIF } from '../tokens.js';
import { esc, footer, header, laneTokens, page, textBox } from './shared.js';

export function renderCover(ctx) {
  const t = laneTokens(ctx);
  const { margin: M, footerZone: FZ } = CANVAS;
  const s = ctx.slide;
  const isCon = ctx.lane === 'construction';

  const kickerCss = isCon
    ? `color:${COLORS.signal};border:2px solid rgba(255,48,64,.85);background:rgba(10,7,8,.55);border-radius:4px;box-shadow:0 0 28px rgba(255,48,64,.25)`
    : `color:#fff;background:${COLORS.red};border-radius:999px;box-shadow:0 16px 40px rgba(184,18,27,.35)`;

  const css = `
  .photo{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover;object-position:center}
  .scrim{position:absolute;inset:0;background:
      linear-gradient(180deg, rgba(10,7,8,.85) 0px, rgba(10,7,8,.50) 200px, rgba(10,7,8,0) 360px),
      linear-gradient(0deg, rgba(10,7,8,.96) 0%, rgba(10,7,8,.90) 20%, rgba(10,7,8,.62) 42%, rgba(10,7,8,.18) 58%, rgba(10,7,8,0) 68%)}
  ${
    isCon
      ? `.grid{position:absolute;inset:0;opacity:.55;background:
          linear-gradient(rgba(255,143,154,.16) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,143,154,.16) 1px, transparent 1px);
        background-size:72px 72px;background-position:-1px -1px;
        -webkit-mask-image:linear-gradient(0deg, #000 0%, rgba(0,0,0,.7) 30%, transparent 55%);
                mask-image:linear-gradient(0deg, #000 0%, rgba(0,0,0,.7) 30%, transparent 55%)}`
      : ''
  }
  .stack{position:absolute;left:${M}px;right:${M}px;bottom:${FZ + 56}px;display:flex;flex-direction:column;align-items:flex-start;gap:34px;z-index:4}
  .kicker{display:block;max-width:100%;height:56px;line-height:52px;padding:0 24px;font-size:26px;font-weight:800;letter-spacing:.2em;
    text-transform:uppercase;white-space:nowrap;overflow:hidden;${kickerCss}}
  .headline{width:100%;${textBox({ size: 100, lh: 1.06, lines: 4 })}font-family:${SERIF};font-weight:600;
    letter-spacing:-.012em;color:#fff;text-wrap:balance;text-shadow:0 20px 60px rgba(0,0,0,.45)}
  `;

  const kicker = s.kicker ? `<div class="kicker" data-fit="kicker">${esc(s.kicker)}</div>` : '';
  const body = `
  <img class="photo" data-image="image" alt="" src="${esc(ctx.asset(s.image))}">
  <div class="scrim"></div>
  ${isCon ? '<div class="grid"></div>' : ''}
  ${header(ctx, { logoFile: PHOTO_LOGO, logoHeight: 110, counterColor: 'rgba(255,255,255,.82)' })}
  <div class="stack">
    ${kicker}
    <h1 class="headline" data-fit="headline">${esc(s.headline)}</h1>
  </div>
  ${footer(ctx, { color: 'rgba(255,255,255,.80)', rule: 'rgba(255,255,255,.22)' })}`;

  return page(ctx, { css, body, bg: t.dark ? COLORS.char : COLORS.ink });
}
