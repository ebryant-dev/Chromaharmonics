import React, { useState } from 'react';
import { Check, Copy, SlidersHorizontal } from 'lucide-react';
import { hslToHex, hslToCss } from '../../utils/color';
import { SwatchRendererProps } from './types';

const ROW_MIN_H = 120;
const CHIP_W = 48;
const CHIP_H = 36;
// Color block occupies 40% of the row width (margin-left of 12px subtracted from flex-basis)
const COLOR_BLOCK_PCT = '40%';

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 22,
      height: 22,
      borderRadius: 4,
      border: `1px solid ${active ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`,
      background: active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
      color: active ? '#a5b4fc' : 'rgba(255,255,255,0.35)',
      cursor: 'pointer',
      flexShrink: 0,
    }}
  >
    {children}
  </button>
);

const ValueRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p style={{
      fontSize: 9,
      fontWeight: 500,
      color: 'rgba(255,255,255,0.28)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      margin: '0 0 2px',
    }}>
      {label}
    </p>
    <p style={{
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 11,
      color: 'rgba(255,255,255,0.5)',
      margin: 0,
      letterSpacing: '0.02em',
    }}>
      {value}
    </p>
  </div>
);

const DocumentRow: React.FC<SwatchRendererProps> = ({
  groups,
  copiedId,
  editingId,
  onCopy,
  onOpenEdit,
}) => {
  const [hoveredChipId, setHoveredChipId] = useState<string | null>(null);

  return (
    <div style={{ width: '100%' }}>
      {groups.map(({ primary, variants }) => {
        const hex = hslToHex(primary.hsl).toUpperCase();
        const css = hslToCss(primary.hsl);
        const { r, g, b } = hexToRgb(hex);
        const { h, s, l } = primary.hsl;
        const copied = copiedId === primary.id;
        const editing = editingId === primary.id;

        return (
          <div key={primary.id}>
            {/* ── Primary row ────────────────────────────────────────── */}
            <div
              style={{
                display: 'flex',
                minHeight: ROW_MIN_H,
                borderBottom: variants.length === 0
                  ? '1px solid rgba(255,255,255,0.06)'
                  : 'none',
              }}
            >
              {/* Color block — 40% of row width */}
              <div
                data-swatch-tile="true"
                style={{
                  position: 'relative',
                  flex: `0 0 calc(${COLOR_BLOCK_PCT} - 12px)`,
                  marginLeft: 12,
                  marginTop: 10,
                  marginBottom: 10,
                  backgroundColor: css,
                  borderRadius: 6,
                  cursor: 'pointer',
                  overflow: 'hidden',
                }}
                onClick={() => onCopy(hex, primary.id)}
              >
                {copied && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.22)',
                    pointerEvents: 'none',
                  }}>
                    <Check size={22} strokeWidth={2.5} color="white" />
                  </div>
                )}
              </div>

              {/* Info panel */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '16px 24px',
                gap: 8,
                minWidth: 0,
              }}>
                {/* Label row + action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.38)',
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    margin: 0,
                  }}>
                    {primary.label}
                  </p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <ActionBtn onClick={() => onCopy(hex, primary.id)} title={`Copy ${hex}`} active={copied}>
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                    </ActionBtn>
                    <ActionBtn onClick={e => onOpenEdit(e, primary.id)} title="Edit color" active={editing}>
                      <SlidersHorizontal size={11} />
                    </ActionBtn>
                  </div>
                </div>

                {/* Hex value */}
                <p style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.9)',
                  margin: 0,
                  letterSpacing: '0.04em',
                }}>
                  {hex}
                </p>

                {/* Separator */}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

                {/* Color values: RGB + HSL */}
                <div style={{ display: 'flex', gap: 32 }}>
                  <ValueRow label="RGB" value={`${r}, ${g}, ${b}`} />
                  <ValueRow label="HSL" value={`${Math.round(h)}°, ${Math.round(s)}%, ${Math.round(l)}%`} />
                </div>
              </div>
            </div>

            {/* ── Variant chips ───────────────────────────────────────── */}
            {variants.length > 0 && (
              <div style={{
                display: 'flex',
                gap: 8,
                padding: `0 24px 10px calc(${COLOR_BLOCK_PCT} + 24px)`,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                flexWrap: 'wrap',
              }}>
                {variants.map(v => {
                  const vHex = hslToHex(v.hsl).toUpperCase();
                  const vCss = hslToCss(v.hsl);
                  const vCopied = copiedId === v.id;
                  const vEditing = editingId === v.id;
                  const vLabel = (v.variantDiff?.l ?? 0) >= 0 ? 'tint' : 'shade';
                  const hovered = hoveredChipId === v.id;

                  return (
                    <div
                      key={v.id}
                      data-swatch-tile="true"
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                      onMouseEnter={() => setHoveredChipId(v.id)}
                      onMouseLeave={() => setHoveredChipId(null)}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width: CHIP_W,
                          height: CHIP_H,
                          backgroundColor: vCss,
                          borderRadius: 4,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                        onClick={() => onCopy(vHex, v.id)}
                      >
                        {vCopied && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.3)',
                          }}>
                            <Check size={13} strokeWidth={2.5} color="white" />
                          </div>
                        )}
                        {hovered && !vCopied && (
                          <button
                            onClick={e => { e.stopPropagation(); onOpenEdit(e, v.id); }}
                            title="Edit variant"
                            style={{
                              position: 'absolute', inset: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: 'rgba(0,0,0,0.28)',
                              border: 'none',
                              cursor: 'pointer',
                              color: vEditing ? '#a5b4fc' : 'rgba(255,255,255,0.85)',
                            }}
                          >
                            <SlidersHorizontal size={12} />
                          </button>
                        )}
                      </div>
                      <p style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: 8,
                        color: 'rgba(255,255,255,0.35)',
                        margin: 0,
                        letterSpacing: '0.02em',
                        textAlign: 'center',
                      }}>
                        {vLabel}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DocumentRow;
