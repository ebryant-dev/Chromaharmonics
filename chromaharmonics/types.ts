export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export type HarmonyType =
  | 'analogous'
  | 'monochromatic'
  | 'triad'
  | 'complementary'
  | 'split-complementary'
  | 'square'
  | 'compound'
  | 'shades';

// A single tint/shade added to a group by the user
export interface VariantSpec {
  id: string;
  s: number;  // saturation shift relative to the group's primary
  l: number;  // lightness shift relative to the group's primary
}

export interface PaletteColor {
  id: string;
  hsl: HSL;
  isBase: boolean;
  angleOffset: number;       // offset from base hue (used by ColorWheel)
  label: string;
  groupIndex: number;        // 0 = base, 1-3 = harmony groups
  isVariant: boolean;        // true for user-added tint/shade swatches
  supportsVariants: boolean; // false for monochromatic / shades standalone colors
  variantDiff?: { s: number; l: number }; // stored so modal can display current shift values
}

export type SwatchStyle = 'overlay' | 'document-row' | 'color-card' | 'paint-chip';

export interface HarmonyConfig {
  name: string;
  description: string;
  defaultAngle: number;
  minAngle: number;
  maxAngle: number;
  symmetryLocked: boolean;
}
