import React from 'react';
import { Check, Copy, SlidersHorizontal } from 'lucide-react';
import { hslToHex, hslToCss, hexToRgb } from '../../utils/color';
import type { PaletteColor } from '../../types';
import { SwatchRendererProps } from './types';

const ActionBtn: React.FC<{
  onClick: (e: React.MouseEvent) => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}> = ({ onClick, title, active, children }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      width:          24,
      height:         24,
      borderRadius:   5,
      border:         'none',
      background:     active ? 'rgba(99,102,241,0.5)' : 'rgba(0,0,0,0.35)',
      color:          active ? '#a5b4fc' : 'rgba(255,255,255,0.8)',
      cursor:         'pointer',
      flexShrink:     0,
    }}
  >
    {children}
  </button>
);

interface SwatchCardProps {
  color: PaletteColor;
  displayLabel: string;
  copied: boolean;
  editing: boolean;
  onCopy: (hex: string, id: string) => void;
  onOpenEdit: (e: React.MouseEvent, id: string) => void;
}

const SwatchCard: React.FC<SwatchCardProps> = ({
  color, displayLabel, copied, editing, onCopy, onOpenEdit,
}) => {
  const hex = hslToHex(color.hsl).toUpperCase();
  const css = hslToCss(color.hsl);
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = color.hsl;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 113, flexShrink: 0 }}>
      {/* ── Color block ──────────────────────────────────────────── */}
      <div
        data-swatch-tile="true"
        style={{
          flex:            '1 0 0',
          borderRadius:    '5px 5px 0 0',
          backgroundColor: css,
          padding:         7,
          display:         'flex',
          alignItems:      'flex-start',
          justifyContent:  'space-between',
          position:        'relative',
          cursor:          'pointer',
          minHeight:       1,
        }}
        onClick={() => onCopy(hex, color.id)}
      >
        {copied && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.22)', pointerEvents: 'none',
          }}>
            <Check size={22} strokeWidth={2.5} color="white" />
          </div>
        )}

        {/* Label chip */}
        <span style={{
          background:    'rgba(0,0,0,0.35)',
          borderRadius:  3,
          padding:       '5px 7px',
          fontSize:      12,
          fontWeight:    600,
          color:         'rgba(255,255,255,0.9)',
          lineHeight:    1,
          pointerEvents: 'none',
          whiteSpace:    'nowrap',
        }}>
          {displayLabel}
        </span>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <ActionBtn
            onClick={e => { e.stopPropagation(); onCopy(hex, color.id); }}
            title={`Copy ${hex}`}
            active={copied}
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
          </ActionBtn>
          <ActionBtn
            onClick={e => onOpenEdit(e, color.id)}
            title="Edit color"
            active={editing}
          >
            <SlidersHorizontal size={10} />
          </ActionBtn>
        </div>
      </div>

      {/* ── Info bar ─────────────────────────────────────────────── */}
      <div style={{
        flexShrink:     0,
        background:     'rgba(255,255,255,0.15)',
        borderRadius:   '0 0 5px 5px',
        padding:        '3px 7px',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            6,
        whiteSpace:     'nowrap',
        overflow:       'hidden',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontFamily: '"JetBrains Mono", monospace' }}>
          Hex {hex}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: '"JetBrains Mono", monospace' }}>
          <b>RGB:</b>{` ${r}, ${g}, ${b}`}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: '"JetBrains Mono", monospace' }}>
          <b>HSL: </b>{Math.round(h)}° {Math.round(s)}% {Math.round(l)}%
        </span>
      </div>
    </div>
  );
};

const Overlay: React.FC<SwatchRendererProps> = ({
  groups, copiedId, editingId, onCopy, onOpenEdit,
}) => (
  <div style={{ display: 'flex', width: '100%', gap: 21, padding: '0 27px', alignItems: 'flex-start' }}>
    {groups.map(({ primary, variants }) => {
      let tintCount = 0;
      let shadeCount = 0;

      return (
        <div
          key={primary.id}
          style={{ flex: '1 0 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <SwatchCard
            color={primary}
            displayLabel={primary.label}
            copied={copiedId === primary.id}
            editing={editingId === primary.id}
            onCopy={onCopy}
            onOpenEdit={onOpenEdit}
          />

          {variants.map(v => {
            const isTint = (v.variantDiff?.l ?? 0) >= 0;
            if (isTint) tintCount++; else shadeCount++;
            const n    = isTint ? tintCount : shadeCount;
            const type = isTint ? 'Tint' : 'Shade';

            return (
              <SwatchCard
                key={v.id}
                color={v}
                displayLabel={`${primary.label} ${type} ${n}`}
                copied={copiedId === v.id}
                editing={editingId === v.id}
                onCopy={onCopy}
                onOpenEdit={onOpenEdit}
              />
            );
          })}
        </div>
      );
    })}
  </div>
);

export default Overlay;
