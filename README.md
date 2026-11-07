# teamjafri-social-design

Turns one JSON spec into on-brand Team Jafri images (JPEG, 1080×1350, 4:5): a carousel of slides, or a single [flier](#fliers-single-image). Colors, fonts and logo come from teamjafri.com and are bundled in `assets/`. Nothing is fetched over the network at render time.

Written for the agent that runs this unattended.

## Requirements

- Node ≥ 20
- Google Chrome at `/usr/bin/google-chrome`. Set `CHROME_PATH` if it's somewhere else.
- No root, no apt, no system fonts, no browser download.

## Install (once per clone)

```bash
npm ci
```

## The one command

```bash
node render.js <spec.json> --out <dir>
```

- **On success:** writes `<dir>/01.jpg`, `02.jpg`, … and prints each path, then `OK <n> slides -> <dir>`. Exit code 0.
- **Format:** JPEG at quality 90, sRGB colour, which is what Instagram's publishing API and TikTok require. Add `--png` only if you specifically need PNG files; it writes `01.png`, … instead.
- **On failure:** prints every problem to stderr as `FAIL [<code> <CATEGORY>] <message>`, deletes `<dir>`, and exits non-zero. A failed run never leaves images behind.
- **Default `--out`:** `out/<spec name>/`.
- **`<dir>` must be new, empty, or contain only `.jpg`/`.png` files.** Anything else is refused with exit 2.

**License values never live in this repo.** At render time, read them from the Brand Brief and put them in the spec's `footer`: the agent name, CalDRE # and broker name for real estate; the licensed name and CSLB # for construction. Nothing in the footer is hardcoded.

**Never pass `--draft` for anything that will be posted.** `--draft` lets placeholder license numbers through, stamps "DRAFT — NOT FOR POSTING" across the top of every slide, and names the files `DRAFT-01.jpg`, …. It exists only for the samples.

To render the samples (a carousel and a flier per lane, in draft mode):

```bash
npm run sample
```

To run the tests that prove every hard fail works:

```bash
npm test
```

## Exit codes

| Code | Meaning | What to do |
|---|---|---|
| 0 | OK | Post the images. |
| 1 | Internal error | Don't post. Report the stack trace. |
| 2 | Invalid spec: bad JSON, unknown lane/layout/field, missing text, unsupported character (emoji, newline), bad args | Fix the spec. |
| 3 | License footer (or a flier's phone) missing, empty, placeholder, wrong format, or written as a JSON number instead of a quoted string | Don't post. Get the real values from the Brand Brief. |
| 4 | Image path missing, unreadable, or not .jpg/.jpeg/.png/.webp; or a cover or flier photo narrower than 1080 px (the message names the slide and the actual width) | Fix the path, or pick a larger photo. Never upscale the file to get past the check. |
| 5 | Text overflows its box (the message names the slide and field) | Shorten that field. Never shrink fonts. |
| 6 | Environment: Chrome missing or won't launch, a bundled font didn't load, network access attempted | Don't post. Report it. |

If several categories fail, the run exits with the code of the first one: 2, 3, 4 during validation, then 6, 3, 4, 5 during rendering.

## Spec format

```json
{
  "lane": "real-estate",
  "footer": { "agentName": "Dana Whitfield", "dre": "01928374", "brokerage": "Valley Oak Realty" },
  "slides": [
    { "layout": "cover", "image": "photos/house.jpg", "kicker": "Central Valley buyers", "headline": "..." },
    { "layout": "point", "stat": "3", "headline": "...", "body": "..." },
    { "layout": "before-after", "before": "photos/a.jpg", "after": "photos/b.jpg", "headline": "..." },
    { "layout": "cta", "headline": "...", "body": "...", "action": "Book a free consult", "url": "teamjafri.com" }
  ]
}
```

- **`lane`:** `"real-estate"` or `"construction"`.
- **`footer`:** every field is required and appears on every slide exactly as written.
  - Real estate: `agentName`, `dre` (exactly 8 digits), `brokerage` (the broker name). Renders as `<agentName> · CalDRE #<dre> · <brokerage>`.
  - Construction: `licensedName` (the name on the CSLB license), `cslb` (6–7 digits). Renders as `<licensedName> · CSLB #<cslb>`.
  - **License numbers are strings in quotes:** `"dre": "01928374"`, never `"dre": 1928374`. The real DRE number starts with 0, and a JSON number would drop it, so a number fails with exit 3.
  - Placeholders fail with exit 3: TBD, TODO, XXX, "Agent Name", "Broker Name", "Licensed Name", `[...]`, 00000000, 12345678, and similar.
- **`slides`:** 1–10 slides. Image paths are relative to the spec file. Unknown fields are rejected.

| Layout | Required | Optional | About how much fits |
|---|---|---|---|
| `cover` | `image`, `headline` | `kicker` | headline about 12 words; kicker about 30 characters |
| `point` | `headline` | `stat`, `body` | stat about 6 characters (`$4,500` fits, `$125,000` doesn't); headline 3 lines with a stat, 4 without; body about 45 words |
| `before-after` | `before`, `after`, `headline` | `beforeLabel`, `afterLabel` | headline about 55 characters |
| `cta` | `headline`, `action` | `body`, `url` (default `teamjafri.com`) | headline about 12 words; body about 25 words; action about 34 characters |

- **Characters:** text may use Latin letters, digits, normal punctuation, curly quotes, dashes, `·`, `€` and `™`. Emoji and line breaks are rejected (exit 2).
- **Photos:** use real Team Jafri photos. Cover photos must be at least 1080 px wide as displayed (phone-camera rotation is taken into account), or the run fails with exit 4. Before/after photos have no minimum, but smaller ones look soft.

## Fliers (single image)

A flier is one image for one post: an offer or announcement with a call to action, the phone number and the website. Use it for a single-image Page/IG post, or as the image for a Facebook group post. It uses the same lanes, footer, checks, exit codes and `--draft` as the carousels.

```json
{
  "lane": "construction",
  "footer": { "licensedName": "Rivera Builders Inc", "cslb": "1047293", "phone": "(209) 014-2753" },
  "slides": [
    {
      "layout": "flier",
      "image": "photos/garage.jpg",
      "headline": "Garage-to-ADU conversions in Tracy",
      "subhead": "Free on-site consultation. No obligation.",
      "bullets": ["Plans and permits handled for you", "Fixed-price quote before work starts", "Built to code, start to finish"],
      "action": "Book your free consult",
      "url": "teamjafri.com"
    }
  ]
}
```

- **One flier per spec.** A flier must be the only slide (exit 2 otherwise). It writes a single `01.jpg`.
- **`footer`:** the lane's footer fields exactly as for carousels (same text at the bottom), **plus `phone`**, which is required for a flier.
  - Read the phone number from the Brand Brief, like the license values. Write it as a quoted string in US format, such as `"(209) 555-0123"` or `"209-555-0123"`. It renders exactly as written.
  - Missing, empty, a JSON number, the wrong format, or a placeholder fails with exit 3. Placeholders include any 555 number, a repeated digit, `1234567890`, `XXX`, and `[...]`. Under `--draft` a placeholder is only a warning.
- **`image` is optional.** With a photo, it fills the top of the flier and must be at least 1080 px wide (exit 4 otherwise). Without one, the top shows the brand background and a large logo.

| Field | Required | About how much fits |
|---|---|---|
| `headline` | yes | 2 lines, about 35 characters (`Garage-to-ADU conversions in Tracy`) |
| `subhead` | no | 2 lines, about 90 characters |
| `bullets` | no; 2–4 items if given | one line each, about 40 characters |
| `action` | yes | the button text, about 30 characters |
| `url` | no (default `teamjafri.com`) | one line |
| `image` | no | a real photo at least 1080 px wide |

Too much text fails with exit 5 and names the field (`headline`, `bullets[2]`, `action`, …). Shorten that field; never shrink fonts. Every text on the flier is at least 34 px, except the license footer (26 px, the same as the carousels).

## Platform note

1080×1350 JPEGs post as-is to Instagram and Facebook. TikTok photo posts are 9:16 (1080×1920), so these slides show there with bars above and below. No 9:16 output exists yet.

## Layout of this repo

- `render.js`: the CLI.
- `src/validate.js`: checks the spec before rendering.
- `src/render.js`: drives Chrome and checks what actually rendered.
- `src/tokens.js` and `src/layouts/`: brand tokens, the 4 carousel layouts and the flier. `src/layouts/index.js` holds the contract between the layouts and the renderer.
- `assets/`: bundled fonts (OFL) and logos. Dark slides and photo covers use `logo-social-dark.png`, the site's dark logo without the "Building Dreams" tagline, which is unreadable on dark at slide size. Light slides keep `logo-full-light.png`.
- `examples/`: the sample specs (`real-estate.json`, `construction.json`, `real-estate-flier.json`, `construction-flier.json`) and photos.
- `test/`: the tests.
- `docker/` and `scripts/container-test.sh`: a fresh-clone, offline render test in a container that mirrors the Sunday machine (Debian 13, Node 20, system Chrome, non-root). Run it with:

  ```bash
  bash scripts/container-test.sh
  ```
