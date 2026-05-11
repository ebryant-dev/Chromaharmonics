# ChromaHarmonics — Roadmap

## Current State
- Interactive color wheel with harmony mode selection (analogous, triad, complementary, split-complementary, square, compound, monochromatic, shades)
- Freeform mode: drag any color freely
- Tints & shades: add variants per harmony group via the edit modal
- Export: copy all hex, download JSON, download PNG (column layout)
- Swatch presentation: **Document Row** (brand-guideline style, default)

---

## Swatch Style Selector

The palette supports multiple presentation modes via `SwatchStyle` in `types.ts`. The active style is held in `App.tsx` (`swatchStyle` state) and passed to `PaletteDisplay`, which dispatches to a renderer in `components/swatch-styles/`.

### Styles
| Style | Status | File | Description |
|---|---|---|---|
| `document-row` | ✅ Done | `DocumentRow.tsx` | Full-width rows, color block left, label + hex right. Brand-guideline feel. |
| `color-card` | 🔲 Planned | `ColorCard.tsx` | Vertical card per group: tall color block on top, info panel below, variants as connected strip at bottom. Pantone/Google Material feel. |
| `paint-chip` | 🔲 Planned | `PaintChip.tsx` | Tall narrow swatches (Pantone chip feel): color fills most of height, small tab at bottom with label + hex. Variants fan out beneath. |

**Next step:** Add a `SwatchStyle` selector UI in the header or Controls area. Wire `setSwatchStyle` (already in `App.tsx`) to it.

---

## Color Values in Info Panel

Currently: **hex only**.

Planned per-style additions (add to `SwatchRendererProps` / renderer display when ready):
- RGB (e.g. `165, 214, 255`)
- HSL (e.g. `210°, 75%, 50%`)
- CMYK approximate (for print reference)

Toggle visibility via a settings panel or per-style config.

---

## PNG Export

Currently renders the old column layout regardless of active swatch style. 

Planned: Update `downloadImage()` in `PaletteDisplay.tsx` to render canvas output matching the active `swatchStyle`. Each renderer should expose a `renderToCanvas(ctx, x, y, w, h)` helper or a shared canvas utility.

---

## Other Ideas
- Color name lookup (closest CSS named color or Pantone approximation)
- Accessibility: WCAG contrast ratio vs. white/black displayed on each swatch
- Share palette via URL hash
- Dark/light panel theme toggle for the info panel (simulate light brand doc background)
