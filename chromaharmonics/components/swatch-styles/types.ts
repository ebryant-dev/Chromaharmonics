import React from 'react';
import { HSL, PaletteColor } from '../../types';

export interface ColorGroup {
  primary: PaletteColor;
  variants: PaletteColor[];
}

export interface SwatchRendererProps {
  groups: ColorGroup[];
  copiedId: string | null;
  editingId: string | null;
  onCopy: (hex: string, id: string) => void;
  onOpenEdit: (e: React.MouseEvent, colorId: string) => void;
  isFreeform: boolean;
  baseColor: HSL;
  groupPrimaryDiffs: Array<{ h: number; s: number; l: number }>;
  onGroupPrimaryDiffChange: (idx: number, diff: { h: number; s: number; l: number }) => void;
  onAddVariant: (groupIndex: number, defaultDiff: { s: number; l: number }) => void;
  onUpdateVariant: (groupIndex: number, variantId: string, diff: { s: number; l: number }) => void;
  onRemoveVariant: (groupIndex: number, variantId: string) => void;
}
