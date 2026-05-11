import React, {
  useState, useCallback, useMemo, useEffect, useRef,
} from 'react';
import { PaletteColor, HSL, SwatchStyle } from '../types';
import { hslToHex, hslToCss } from '../utils/color';
import {
  Check, Copy,
  SlidersHorizontal, X, Plus,
} from 'lucide-react';
import Overlay    from './swatch-styles/Overlay';
import DocumentRow from './swatch-styles/DocumentRow';
import ColorCard  from './swatch-styles/ColorCard';
import PaintChip  from './swatch-styles/PaintChip';
import type { ColorGroup, SwatchRendererProps } from './swatch-styles/types';

// ── Props ─────────────────────────────────────────────────────────────────────
interface PaletteDisplayProps {
  palette: PaletteColor[];
  isFreeform: boolean;
  baseColor: HSL;
  onBaseColorChange: (hsl: HSL) => void;
  groupPrimaryDiffs: Array<{ h: number; s: number; l: number }>;
  onGroupPrimaryDiffChange: (idx: number, diff: { h: number; s: number; l: number }) => void;
  onAddVariant: (groupIndex: number, defaultDiff: { s: number; l: number }) => void;
  onUpdateVariant: (groupIndex: number, variantId: string, diff: { s: number; l: number }) => void;
  onRemoveVariant: (groupIndex: number, variantId: string) => void;
  swatchStyle: SwatchStyle;
}

// ── Color group ───────────────────────────────────────────────────────────────
export function groupPalette(palette: PaletteColor[]): ColorGroup[] {
  const result: ColorGroup[] = [];
  let i = 0;
  while (i < palette.length) {
    const cur = palette[i];
    if (cur.isVariant) { i++; continue; }
    const group: ColorGroup = { primary: cur, variants: [] };
    i++;
    while (i < palette.length && palette[i].isVariant && palette[i].groupIndex === cur.groupIndex) {
      group.variants.push(palette[i]);
      i++;
    }
    result.push(group);
  }
  return result;
}

// ── Modal target ──────────────────────────────────────────────────────────────
interface EditTarget { colorId: string; anchorRect: DOMRect }

// ── Modal slider ──────────────────────────────────────────────────────────────
interface MSliderProps {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void; accent?: string; unit?: string;
}
const MSlider: React.FC<MSliderProps> = ({
  label, value, min, max, onChange, accent = '#818cf8', unit = '',
}) => {
  const pct = ((value - min) / (max - min)) * 100;
  const display = (value > 0 && min < 0) ? `+${Math.round(value)}` : String(Math.round(value));
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] text-slate-500">{label}</span>
        <span className="text-[10px] font-mono" style={{ color: accent }}>{display}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ '--pct': `${pct}%`, accentColor: accent } as React.CSSProperties}
      />
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const PaletteDisplay: React.FC<PaletteDisplayProps> = ({
  palette, isFreeform, swatchStyle,
  baseColor, onBaseColorChange,
  groupPrimaryDiffs, onGroupPrimaryDiffChange,
  onAddVariant, onUpdateVariant, onRemoveVariant,
}) => {
  const [copiedId, setCopiedId]     = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const modalRef                    = useRef<HTMLDivElement>(null);

  const copy = useCallback((hex: string, id: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  }, []);

  const groups = useMemo(() => groupPalette(palette), [palette]);

  // ── Modal lifecycle ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!editTarget) return;
    const onDown = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setEditTarget(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [editTarget]);

  useEffect(() => {
    if (!editTarget) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditTarget(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editTarget]);

  const openEdit = (e: React.MouseEvent, colorId: string) => {
    e.stopPropagation();
    let el = e.currentTarget as HTMLElement;
    while (el && !el.dataset.swatchTile) el = el.parentElement as HTMLElement;
    const rect = el ? el.getBoundingClientRect() : (e.currentTarget as HTMLElement).getBoundingClientRect();
    setEditTarget({ colorId, anchorRect: rect });
  };

  // ── Edit modal ────────────────────────────────────────────────────────────
  const renderModal = () => {
    if (!editTarget) return null;

    const color = palette.find(c => c.id === editTarget.colorId);
    if (!color) return null;

    const { anchorRect } = editTarget;
    const MODAL_W = 224;
    const GAP     = 10;
    const left    = Math.max(8, Math.min(anchorRect.left, window.innerWidth - MODAL_W - 8));
    const bottom  = window.innerHeight - anchorRect.top + GAP;

    const isBase     = color.isBase;
    const isVariant  = color.isVariant;
    const groupIndex = color.groupIndex;
    const primDiff   = groupPrimaryDiffs[groupIndex] ?? { h: 0, s: 0, l: 0 };
    const varDiff    = color.variantDiff ?? { s: 0, l: 0 };

    let modalTitle = color.label.replace(' (Variant)', '');
    if (isVariant && color.variantDiff) {
      modalTitle = color.variantDiff.l >= 0 ? 'Tint' : 'Shade';
    }

    return (
      <div
        ref={modalRef}
        style={{
          position: 'fixed', bottom, left,
          width: MODAL_W,
          background: '#0f1623',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.12)',
          zIndex: 1000,
          padding: '12px 13px 13px',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="rounded"
              style={{ width: 14, height: 14, flexShrink: 0, backgroundColor: hslToCss(color.hsl), border: '1px solid rgba(255,255,255,0.15)' }}
            />
            <span className="text-[11px] font-semibold text-slate-300">{modalTitle}</span>
          </div>
          <button
            onClick={() => setEditTarget(null)}
            className="flex items-center justify-center rounded transition-colors"
            style={{ width: 20, height: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }}
          >
            <X size={11} />
          </button>
        </div>

        {/* ── Variant modal ─────────────────────────────────────────────── */}
        {isVariant && (
          <>
            <div className="space-y-2.5">
              <MSlider label="Saturation shift" value={varDiff.s} min={-100} max={100}
                onChange={v => onUpdateVariant(groupIndex, color.id, { ...varDiff, s: v })} accent="#ec4899" />
              <MSlider label="Lightness shift" value={varDiff.l} min={-100} max={100}
                onChange={v => onUpdateVariant(groupIndex, color.id, { ...varDiff, l: v })} accent="#14b8a6" />
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '10px 0' }} />
            <button
              onClick={() => { onRemoveVariant(groupIndex, color.id); setEditTarget(null); }}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg text-[11px] transition-colors"
              style={{ height: 30, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
            >
              <X size={11} /> Remove
            </button>
          </>
        )}

        {/* ── Primary / base modal ──────────────────────────────────────── */}
        {!isVariant && (
          <>
            <div className="space-y-2.5">
              {isBase ? (
                <>
                  <MSlider label="Hue" value={baseColor.h} min={0} max={360} unit="°"
                    onChange={v => onBaseColorChange({ ...baseColor, h: v })} accent="#818cf8" />
                  <MSlider label="Saturation" value={baseColor.s} min={0} max={100} unit="%"
                    onChange={v => onBaseColorChange({ ...baseColor, s: v })} accent="#ec4899" />
                  <MSlider label="Lightness" value={baseColor.l} min={0} max={100} unit="%"
                    onChange={v => onBaseColorChange({ ...baseColor, l: v })} accent="#14b8a6" />
                </>
              ) : (
                <>
                  <MSlider label="Hue nudge" value={primDiff.h} min={-60} max={60} unit="°"
                    onChange={v => onGroupPrimaryDiffChange(groupIndex, { ...primDiff, h: v })} accent="#818cf8" />
                  <MSlider label="Saturation" value={primDiff.s} min={-100} max={100}
                    onChange={v => onGroupPrimaryDiffChange(groupIndex, { ...primDiff, s: v })} accent="#ec4899" />
                  <MSlider label="Lightness" value={primDiff.l} min={-100} max={100}
                    onChange={v => onGroupPrimaryDiffChange(groupIndex, { ...primDiff, l: v })} accent="#14b8a6" />
                </>
              )}
            </div>

            {color.supportsVariants && !isFreeform && (
              <>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '10px 0' }} />
                <div className="flex gap-2">
                  {[
                    { label: '+ Tint',  diff: { s: -5, l: +28 } },
                    { label: '+ Shade', diff: { s: +5, l: -28 } },
                  ].map(({ label, diff }) => (
                    <button
                      key={label}
                      onClick={() => { onAddVariant(groupIndex, diff); setEditTarget(null); }}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg text-[11px] transition-colors"
                      style={{ height: 30, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}
                    >
                      <Plus size={10} />{label.replace('+ ', '')}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    );
  };

  // ── Style renderer props ──────────────────────────────────────────────────
  const rendererProps: SwatchRendererProps = {
    groups,
    copiedId,
    editingId: editTarget?.colorId ?? null,
    onCopy: copy,
    onOpenEdit: openEdit,
    isFreeform,
    baseColor,
    groupPrimaryDiffs,
    onGroupPrimaryDiffChange,
    onAddVariant,
    onUpdateVariant,
    onRemoveVariant,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="w-full">
        {swatchStyle === 'overlay'      && <Overlay      {...rendererProps} />}
        {swatchStyle === 'document-row' && <DocumentRow {...rendererProps} />}
        {swatchStyle === 'color-card'   && <ColorCard   {...rendererProps} />}
        {swatchStyle === 'paint-chip'   && <PaintChip   {...rendererProps} />}
      </div>

      {renderModal()}
    </>
  );
};

export default PaletteDisplay;
