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

**License values and the phone number never live in this repo.** At render time, read them from the Brand Brief and put them in the spec's `footer`: the agent name, CalDRE #, broker name and phone for real estate; the licensed name, CSLB # and phone for construction. Nothing in the footer or on the CTA button is hardcoded, so a new phone number is a one-line edit in the Brand Brief.

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
| 3 | License footer or phone missing, empty, placeholder, wrong format, or written as a JSON number instead of a quoted string; or a slide rendered without the phone in its footer | Don't post. Get the real values from the Brand Brief. |
| 4 | Image path missing, unreadable, or not .jpg/.jpeg/.png/.webp; or a cover or flier photo narrower than 1080 px (the message names the slide and the actual width) | Fix the path, or pick a larger photo. Never upscale the file to get past the check. |
| 5 | Text overflows its box (the message names the slide and field) | Shorten that field. Never shrink fonts. |
| 6 | Environment: Chrome missing or won't launch, a bundled font didn't load, network access attempted | Don't post. Report it. |

If several categories fail, the run exits with the code of the first one: 2, 3, 4 during validation, then 6, 3, 4, 5 during rendering.

A `WARNING` line never changes the exit code. Besides `--draft` placeholders, the only warning is for a `cta` slide or a flier that still sends `action` or `url`; remove those fields.

## Spec format

```json
{
  "lane": "real-estate",
  "footer": { "agentName": "Dana Whitfield", "dre": "01928374", "brokerage": "Valley Oak Realty", "phone": "(209) 014-2753" },
  "slides": [
    { "layout": "cover", "image": "photos/house.jpg", "kicker": "Central Valley buyers", "headline": "..." },
    { "layout": "point", "stat": "3", "headline": "...", "body": "..." },
    { "layout": "before-after", "before": "photos/a.jpg", "after": "photos/b.jpg", "headline": "..." },
    { "layout": "cta", "headline": "...", "body": "..." }
  ]
}
```

- **`lane`:** `"real-estate"` or `"construction"`.
- **`footer`:** every field is required and appears on every slide exactly as written. The license text is on the left of the footer line and the phone is on the right, both at 26 px. If they don't fit together, the run fails with exit 5; nothing is shrunk.
  - Real estate: `agentName`, `dre` (exactly 8 digits), `brokerage` (the broker name), `phone`. Renders as `<agentName> · CalDRE #<dre> · <brokerage>` plus `<phone>`.
  - Construction: `licensedName` (the name on the CSLB license), `cslb` (6–7 digits), `phone`. Renders as `<licensedName> · CSLB #<cslb>` plus `<phone>`.
  - **`phone`:** a quoted string in US format, such as `"(209) 555-0123"` or `"209-555-0123"`, rendered exactly as written. It also builds the CTA button. Missing, empty, a JSON number, the wrong format, or a placeholder (any 555 number, a repeated digit, `1234567890`, `XXX`, `[...]`) fails with exit 3. The renderer also fails any slide whose footer doesn't show it.
  - **License numbers are strings in quotes:** `"dre": "01928374"`, never `"dre": 1928374`. The real DRE number starts with 0, and a JSON number would drop it, so a number fails with exit 3.
  - Placeholders fail with exit 3: TBD, TODO, XXX, "Agent Name", "Broker Name", "Licensed Name", `[...]`, 00000000, 12345678, and similar.
- **`slides`:** 1–10 slides. Image paths are relative to the spec file. Unknown fields are rejected.

| Layout | Required | Optional | About how much fits |
|---|---|---|---|
| `cover` | `image`, `headline` | `kicker` | headline about 12 words; kicker about 30 characters |
| `point` | `headline` | `stat`, `body` | stat about 6 characters (`$4,500` fits, `$125,000` doesn't); headline 3 lines with a stat, 4 without; body about 45 words |
| `before-after` | `before`, `after`, `headline` | `beforeLabel`, `afterLabel` | headline about 55 characters |
| `cta` | `headline` | `body` | headline about 12 words; body about 25 words |

- **CTA slide:** the button always reads `Call or text <footer.phone>`, with `Or send us a DM` under it. Don't send `action` or `url` on a `cta` slide; if you do, the slide still renders, they are ignored, and a `WARNING` names them.
- **Characters:** text may use Latin letters, digits, normal punctuation, curly quotes, dashes, `·`, `€` and `™`. Emoji and line breaks are rejected (exit 2).
- **Photos:** use real Team Jafri photos. Cover photos must be at least 1080 px wide as displayed (phone-camera rotation is taken into account), or the run fails with exit 4. Before/after photos have no minimum, but smaller ones look soft.

## Fliers (single image)

A flier is one image for one post: an offer or announcement that ends in the same call/DM block as the carousel CTA slide. Use it for a single-image Page/IG post, or as the image for a Facebook group post. It uses the same lanes, footer, checks, exit codes and `--draft` as the carousels.

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
      "bullets": ["Plans and permits handled for you", "Fixed-price quote before work starts", "Built to code, start to finish"]
    }
  ]
}
```

- **One flier per spec.** A flier must be the only slide (exit 2 otherwise). It writes a single `01.jpg`.
- **`footer`:** exactly the same fields as for carousels, `phone` included.
- **Call to action:** the button always reads `Call or text <footer.phone>`, with `Or send us a DM` under it, the same as the carousel CTA slide. Don't send `action` or `url`; if you do, the flier still renders, they are ignored, and a `WARNING` names them.
- **`image` is optional.** With a photo, it fills the top of the flier and must be at least 1080 px wide (exit 4 otherwise). Without one, the top shows the brand background and a large logo.

| Field | Required | About how much fits |
|---|---|---|
| `headline` | yes | 2 lines, about 35 characters (`Garage-to-ADU conversions in Tracy`) |
| `subhead` | no | 2 lines, about 90 characters |
| `bullets` | no; 2–4 items if given | one line each, about 50 characters |
| `image` | no | a real photo at least 1080 px wide |

Too much text fails with exit 5 and names the field (`headline`, `subhead`, `bullets[2]`, …). Shorten that field; never shrink fonts. Every text on the flier is at least 34 px, except the license footer (26 px, the same as the carousels).

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
