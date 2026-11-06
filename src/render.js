// Chrome side: turn validated slides into PNGs and check what actually rendered.
// renderSlides() never throws for content problems; it returns { errors, images }.
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { LAYOUTS } from './layouts/index.js';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const WIDTH = 1080;
export const HEIGHT = 1350;

const CHROME_CANDIDATES = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

export function findChrome(env = process.env) {
  if (env.CHROME_PATH) {
    return existsSync(env.CHROME_PATH)
      ? { path: env.CHROME_PATH }
      : { error: `CHROME_PATH is set to ${env.CHROME_PATH} but that file does not exist` };
  }
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  return found
    ? { path: found }
    : { error: `Google Chrome not found (looked in: ${CHROME_CANDIDATES.join(', ')}). Install Chrome or set CHROME_PATH.` };
}

// Runs inside the page after load.
async function inspectPage() {
  // Load every declared face (including ones this slide doesn't use) so a broken font file always surfaces.
  await Promise.allSettled([...document.fonts].map((f) => f.load()));
  await document.fonts.ready;
  const unquote = (s) => s.trim().replace(/^["']|["']$/g, '');
  const faces = [...document.fonts].map((f) => ({
    family: unquote(f.family), weight: f.weight, style: f.style, status: f.status,
  }));
  const loadedFamilies = new Set(faces.filter((f) => f.status === 'loaded').map((f) => f.family.toLowerCase()));
  const fit = [...document.querySelectorAll('[data-fit]')].map((el) => {
    const cs = getComputedStyle(el);
    const family = unquote(cs.fontFamily.split(',')[0]);
    // Only enforced once the layouts declare @font-face; then every text box must use a bundled face.
    const fontOk = faces.length === 0 || (loadedFamilies.has(family.toLowerCase())
      && document.fonts.check(`${cs.fontStyle} ${cs.fontWeight} 40px "${family}"`));
    return {
      name: el.getAttribute('data-fit'),
      tall: el.scrollHeight - el.clientHeight,
      wide: el.scrollWidth - el.clientWidth,
      font: `${cs.fontStyle} ${cs.fontWeight} "${family}"`,
      fontOk,
    };
  });
  const brokenImgs = [...document.images]
    .filter((img) => !img.complete || img.naturalWidth === 0)
    .map((img) => img.getAttribute('src'));
  // naturalWidth is after EXIF orientation, i.e. the width as the photo is actually shown.
  const photos = [...document.querySelectorAll('img[data-image]')]
    .map((img) => ({ field: img.getAttribute('data-image'), width: img.naturalWidth }));
  return { faces, fit, brokenImgs, photos };
}

// format: 'jpeg' (default; quality 90, sRGB; what Instagram's API and TikTok require) or 'png'.
export async function renderSlides({ lane, footer, slides, draft, workDir, chromePath, renderSlideHtml, format = 'jpeg' }) {
  const errors = [];
  const images = [];
  let label = 'page';
  let browser;
  try {
    browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox', '--force-color-profile=srgb'] });
  } catch (e) {
    return { errors: [{ code: 6, msg: `could not launch Chrome at ${chromePath}: ${e.message.split('\n')[0]}` }], images };
  }
  try {
    const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
    // Provably offline: anything that isn't a local file is aborted and fails the run.
    await context.route('**/*', (route) => {
      const url = route.request().url();
      if (url.startsWith('file:') || url.startsWith('data:')) return route.continue();
      errors.push({ code: 6, msg: `${label} tried to load a network URL (blocked): ${url}` });
      return route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    page.on('requestfailed', (req) => {
      const url = req.url();
      if (!url.startsWith('file:')) return; // network aborts already reported above
      const file = fileURLToPath(url);
      const isImage = /\.(jpe?g|png|webp|gif|svg)$/i.test(file);
      errors.push({ code: isImage ? 4 : 6, msg: `${label} failed to load ${file} (${req.failure()?.errorText})` });
    });

    for (const [i, slide] of slides.entries()) {
      const n = String(i + 1).padStart(2, '0');
      label = `slide ${i + 1} (${slide.layout})`;
      const html = renderSlideHtml({
        lane, footer, slide, index: i + 1, total: slides.length, draft,
        asset: (p) => pathToFileURL(p).href,
        repoRoot: REPO_ROOT,
      });
      const htmlPath = path.join(workDir, `slide-${n}.html`);
      await fs.writeFile(htmlPath, html);
      await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
      const { faces, fit, brokenImgs, photos } = await page.evaluate(inspectPage);

      for (const f of faces.filter((x) => x.status !== 'loaded')) {
        errors.push({ code: 6, msg: `${label} font "${f.family}" ${f.weight} ${f.style} did not load (status: ${f.status})` });
      }
      for (const f of fit.filter((x) => !x.fontOk)) {
        errors.push({ code: 6, msg: `${label} field '${f.name}' renders in ${f.font}, which is not a loaded bundled @font-face` });
      }
      for (const src of brokenImgs) errors.push({ code: 4, msg: `${label} image did not load: ${src}` });
      for (const [field, min] of Object.entries(LAYOUTS[slide.layout]?.minWidth ?? {})) {
        const photo = photos.find((p) => p.field === field);
        if (!photo) {
          errors.push({ code: 4, msg: `${label} can't measure image '${field}': layout has no img[data-image="${field}"]` });
        } else if (photo.width > 0 && photo.width < min) {
          errors.push({ code: 4, msg: `${label} image '${field}' is ${photo.width}px wide; ${slide.layout} photos must be at least ${min}px wide: ${slide[field]}` });
        }
      }
      if (!fit.some((f) => f.name === 'footer')) {
        errors.push({ code: 3, msg: `${label} has no [data-fit="footer"] element; the license footer must be on every slide` });
      }
      for (const f of fit.filter((x) => x.tall > 1 || x.wide > 1)) {
        const parts = [f.tall > 1 && `${f.tall}px tall`, f.wide > 1 && `${f.wide}px wide`].filter(Boolean);
        errors.push({ code: 5, msg: `${label} field '${f.name}' overflows by ${parts.join(' / ')}` });
      }

      const file = path.join(workDir, `${n}.${format === 'png' ? 'png' : 'jpg'}`);
      await page.screenshot({
        path: file, type: format, ...(format === 'jpeg' && { quality: 90 }),
        clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT }, animations: 'disabled',
      });
      images.push(file);
    }
  } finally {
    await browser.close();
  }
  return { errors, images };
}
