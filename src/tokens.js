// Brand tokens for Team Jafri social slides.
// Source of truth: teamjafri.com (site/public/assets/site.css :root + assets/brand/BRAND.md).
// One shared palette; the two lanes differ only by surface + a single accent.

export const COLORS = {
  ink: '#121214',
  inkSoft: '#343239',
  muted: '#6D6870',
  paper: '#F7F4EF',
  paper2: '#EEE8DF',
  white: '#FFFFFF',
  red: '#B8121B',
  redDark: '#760B12',
  char: '#0A0708',
  char2: '#070405',
  signal: '#FF3040',
  glow: '#E4383F',
  blueprintLine: '#FF8F9A',
};

// Canvas + spacing (px). 4:5 Instagram/Facebook portrait.
export const CANVAS = {
  width: 1080,
  height: 1350,
  margin: 72, // side margin (>= 64)
  top: 72, // top of the header row (logo / counter)
  footerZone: 120, // bottom zone reserved for the license footer
  radius: 18, // site --radius
  draftBand: 56,
};

// Per-lane surface + accent. Everything not listed here is shared.
export const LANES = {
  'real-estate': {
    surface: COLORS.paper,
    surface2: COLORS.paper2,
    text: COLORS.ink,
    textSoft: COLORS.inkSoft,
    muted: COLORS.muted,
    accent: COLORS.red,
    accentDeep: COLORS.redDark,
    hairline: 'rgba(18, 18, 20, 0.13)',
    logoFull: 'logo-full-light.png', // ink wordmark, light backgrounds only
    dark: false,
  },
  construction: {
    surface: COLORS.char,
    surface2: COLORS.char2,
    text: COLORS.white,
    textSoft: 'rgba(255, 255, 255, 0.80)',
    muted: 'rgba(255, 255, 255, 0.66)',
    accent: COLORS.signal, // large text / UI only on char
    accentDeep: COLORS.glow, // graphics only
    hairline: 'rgba(255, 255, 255, 0.16)',
    logoFull: 'logo-social-dark.png', // white wordmark + red roofs, no tagline (illegible on dark at slide size)
    dark: true,
  },
};

// The dark-background logo is the only one allowed over photos (always behind a scrim).
export const PHOTO_LOGO = 'logo-social-dark.png';

// Bundled latin-subset woff2 files in assets/fonts.
export const FONT_FACES = [
  { family: 'Manrope', weight: 400, style: 'normal', file: 'manrope-latin-400-normal.woff2' },
  { family: 'Manrope', weight: 500, style: 'normal', file: 'manrope-latin-500-normal.woff2' },
  { family: 'Manrope', weight: 600, style: 'normal', file: 'manrope-latin-600-normal.woff2' },
  { family: 'Manrope', weight: 700, style: 'normal', file: 'manrope-latin-700-normal.woff2' },
  { family: 'Manrope', weight: 800, style: 'normal', file: 'manrope-latin-800-normal.woff2' },
  { family: 'Noto Serif', weight: 400, style: 'normal', file: 'noto-serif-latin-400-normal.woff2' },
  { family: 'Noto Serif', weight: 600, style: 'normal', file: 'noto-serif-latin-600-normal.woff2' },
  { family: 'Noto Serif', weight: 700, style: 'normal', file: 'noto-serif-latin-700-normal.woff2' },
  { family: 'Noto Serif', weight: 400, style: 'italic', file: 'noto-serif-latin-400-italic.woff2' },
  { family: 'Noto Serif', weight: 600, style: 'italic', file: 'noto-serif-latin-600-italic.woff2' },
];

export const SANS = "'Manrope', sans-serif";
export const SERIF = "'Noto Serif', serif";

export const DEFAULT_URL = 'teamjafri.com';
// CTA slide copy. The phone itself always comes from the spec's footer.phone (Brand Brief), never from here.
export const ctaButtonText = (phone) => `Call or text ${phone}`;
export const CTA_DM_LINE = 'Or send us a DM';
export const DRAFT_TEXT = 'DRAFT — NOT FOR POSTING';

// Every value comes from the spec (Grok reads them from the Brand Brief). License numbers are strings.
export function footerText(lane, footer) {
  if (lane === 'real-estate') return `${footer.agentName} · CalDRE #${footer.dre} · ${footer.brokerage}`;
  return `${footer.licensedName} · CSLB #${footer.cslb}`;
}
