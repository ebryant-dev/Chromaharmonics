import { HSL, PaletteColor, HarmonyType, VariantSpec } from '../types';

// Helper: Normalize degrees to 0-360
export const normalizeHue = (h: number): number => {
  let n = h % 360;
  if (n < 0) n += 360;
  return n;
};

// Helper: HSL to CSS String
export const hslToCss = (hsl: HSL): string => {
  const h = Math.round(hsl.h) || 0;
  const s = Math.round(Math.max(0, Math.min(100, hsl.s))) || 0;
  const l = Math.round(Math.max(0, Math.min(100, hsl.l))) || 0;
  return `hsl(${h}, ${s}%, ${l}%)`;
};

// Helper: HSL to Hex
export const hslToHex = ({ h, s, l }: HSL): string => {
  const sValid = Math.max(0, Math.min(100, s || 0));
  const lValid = Math.max(0, Math.min(100, l || 0));
  const hValid = h || 0;

  const lDec = lValid / 100;
  const a = sValid * Math.min(lDec, 1 - lDec) / 100;

  const f = (n: number) => {
    const k = (n + hValid / 30) % 12;
    const color = lDec - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

// Helper: Hex to HSL
export const hexToHsl = (hex: string): HSL | null => {
  hex = hex.replace(/[^0-9a-fA-F]/g, '');

  let r = 0, g = 0, b = 0;
  if (hex.length === 3) {
    r = parseInt("0x" + hex[0] + hex[0]);
    g = parseInt("0x" + hex[1] + hex[1]);
    b = parseInt("0x" + hex[2] + hex[2]);
  } else if (hex.length === 6) {
    r = parseInt("0x" + hex[0] + hex[1]);
    g = parseInt("0x" + hex[2] + hex[3]);
    b = parseInt("0x" + hex[4] + hex[5]);
  } else {
    return null;
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

  r /= 255; g /= 255; b /= 255;
  const cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin;
  let h = 0, s = 0, l = 0;

  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s: s * 100, l: l * 100 };
};

// Helper: Hex to RGB
export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
};

// ─── Generate Palette ──────────────────────────────────────────────────────────
export const generatePalette = (
  base: HSL,
  harmony: HarmonyType,
  angle: number,
  // Per-group primary hue nudge + S/L shifts (index 0 = base, unused by code but kept for alignment)
  groupPrimaryDiffs: Array<{ h: number; s: number; l: number }> = [
    { h: 0, s: 0, l: 0 },
    { h: 0, s: 0, l: 0 },
    { h: 0, s: 0, l: 0 },
    { h: 0, s: 0, l: 0 },
  ],
  // Per-group user-added tint/shade variants
  groupVariants: VariantSpec[][] = [[], [], [], []],
  showDirectComplement: boolean = false,
): PaletteColor[] => {
  const colors: PaletteColor[] = [];

  const baseS = Number(base.s) || 0;
  const baseL = Number(base.l) || 0;
  const baseH = Number(base.h) || 0;
  const safeAngle = Number(angle) || 0;

  // ── Gradient modes — standalone colors, no variants ─────────────────────────
  const addColor = (
    offset: number,
    label: string,
    s = baseS,
    l = baseL,
    idOverride?: string
  ) => {
    colors.push({
      id: idOverride || `${harmony}-${offset}-${label.replace(/\s+/g, '-')}`,
      hsl: { h: normalizeHue(baseH + offset), s, l },
      isBase: offset === 0 && l === baseL && s === baseS,
      angleOffset: offset,
      label,
      groupIndex: colors.length,
      isVariant: false,
      supportsVariants: false,
    });
  };

  // ── Angular harmonies — primary + user-defined tint/shade variants ───────────
  const addPair = (
    offset: number,
    labelBase: string,
    groupIndex: number,
    primaryId?: string
  ) => {
    const isBaseGroup = groupIndex === 0;
    const primDiff = groupPrimaryDiffs[groupIndex] ?? { h: 0, s: 0, l: 0 };

    const hue = normalizeHue(baseH + offset + (isBaseGroup ? 0 : primDiff.h));
    const primS = isBaseGroup ? baseS : Math.max(0, Math.min(100, baseS + primDiff.s));
    const primL = isBaseGroup ? baseL : Math.max(0, Math.min(100, baseL + primDiff.l));

    // Primary
    colors.push({
      id: primaryId || `${harmony}-g${groupIndex}-primary`,
      hsl: { h: hue, s: primS, l: primL },
      isBase: isBaseGroup,
      angleOffset: offset,
      label: labelBase,
      groupIndex,
      isVariant: false,
      supportsVariants: true,
    });

    // User-added variants (tints/shades) for this group
    const variants = groupVariants[groupIndex] ?? [];
    variants.forEach((varSpec) => {
      const vs = Math.max(0, Math.min(100, primS + varSpec.s));
      const vl = Math.max(0, Math.min(100, primL + varSpec.l));
      colors.push({
        id: varSpec.id,
        hsl: { h: hue, s: vs, l: vl },
        isBase: false,
        angleOffset: offset,
        label: `${labelBase} (Variant)`,
        groupIndex,
        isVariant: true,
        supportsVariants: false,
        variantDiff: { s: varSpec.s, l: varSpec.l },
      });
    });
  };

  switch (harmony) {
    case 'analogous':
      addPair(0,          'Base',       0, 'base');
      addPair(-safeAngle, 'Analogous 1', 1);
      addPair(safeAngle,  'Analogous 2', 2);
      break;

    case 'monochromatic': {
      const step = Math.max(10, safeAngle / 2);
      addColor(0, 'Base',    baseS, baseL,                         'base');
      addColor(0, 'Darker',  baseS, Math.max(5,   baseL - step * 1.5));
      addColor(0, 'Dark',    baseS, Math.max(10,  baseL - step));
      addColor(0, 'Light',   baseS, Math.min(95,  baseL + step));
      addColor(0, 'Lighter', baseS, Math.min(100, baseL + step * 1.5));
      break;
    }

    case 'shades': {
      const shadeStep = 15;
      addColor(0, 'Base',    baseS, baseL,                           'base');
      addColor(0, 'Shade 2', baseS, Math.max(5,  baseL - shadeStep * 2));
      addColor(0, 'Shade 1', baseS, Math.max(5,  baseL - shadeStep));
      addColor(0, 'Tint 1',  baseS, Math.min(95, baseL + shadeStep));
      addColor(0, 'Tint 2',  baseS, Math.min(95, baseL + shadeStep * 2));
      break;
    }

    case 'complementary':
      addPair(0,   'Base',       0, 'base');
      addPair(180, 'Complement', 1);
      break;

    case 'split-complementary':
      addPair(0,               'Base',           0, 'base');
      addPair(180 - safeAngle, 'Split 1',        1);
      addPair(180 + safeAngle, 'Split 2',        2);
      if (showDirectComplement) {
        addPair(180, 'True Complement', 3, 'direct-complement');
      }
      break;

    case 'triad':
      addPair(0,               'Base',    0, 'base');
      addPair(safeAngle,       'Triad 1', 1);
      addPair(360 - safeAngle, 'Triad 2', 2);
      break;

    case 'square':
      addPair(0,   'Base',     0, 'base');
      addPair(90,  'Square 1', 1);
      addPair(180, 'Square 2', 2);
      addPair(270, 'Square 3', 3);
      break;

    case 'compound':
      addPair(0,               'Base',         0, 'base');
      addPair(safeAngle,       'Adjacent',     1);
      addPair(180,             'Complement',   2);
      addPair(180 + safeAngle, 'Far Adjacent', 3);
      break;
  }

  return colors;
};
