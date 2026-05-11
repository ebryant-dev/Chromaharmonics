import React, { useState } from 'react';
import { Check, Copy, SlidersHorizontal } from 'lucide-react';
import { hslToHex, hslToCss } from '../../utils/color';
import { SwatchRendererProps } from './types';

const COLOR_BLOCK_H = 180;
const VARIANT_BLOCK_H = 52;

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

const ColorCard: React.FC<SwatchRendererProps> = ({
  groups,
  copiedId,
  editingId,
  onCopy,
  onOpenEdit,
}) => {
  const [hoveredVariantId, setHoveredVariantId] = useState<string | null>(null);

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      padding: '16px 12px',
      gap: 12,
      alignItems: 'flex-start',
      boxSizing: 'border-box',
    }}>
      {groups.map(({ primary, variants }) => {
        const hex = hslToHex(primary.hsl).toUpperCase();
        const css = hslToCss(primary.hsl);
        const { r, g, b } = hexToRgb(hex);
        const { h, s, l } = primary.hsl;
        const copied = copiedId === primary.id;
        const editing = editingId === primary.id;

        return (
          <div
            key={primary.id}
            style={{
              flex: '1 1 0',
              minWidth: 140,
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            {/* ── Color block ─────────────────────────────────────── */}
            <div
              data-swatch-tile="true"
              style={{
                position: 'relative',
                height: COLOR_BLOCK_H,
                backgroundColor: css,
                cursor: 'pointer',
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
                  <Check size={24} strokeWidth={2.5} color="white" />
                </div>
              )}
            </div>

            {/* ── Info panel ──────────────────────────────────────── */}
            <div style={{
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              background: 'rgba(255,255,255,0.02)',
            }}>
              {/* Label + buttons */}
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

              {/* Hex */}
              <p style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 15,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.9)',
                margin: 0,
                letterSpacing: '0.04em',
              }}>
                {hex}
              </p>

              {/* Separator */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

              {/* Color values */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {([
                  { label: 'RGB', value: `${r}, ${g}, ${b}` },
                  { label: 'HSL', value: `${Math.round(h)}°, ${Math.round(s)}%, ${Math.round(l)}%` },
                ] as const).map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.28)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      flexShrink: 0,
                      width: 24,
                    }}>
                      {label}
                    </span>
                    <span style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.5)',
                      letterSpacing: '0.02em',
                    }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Variant strip ───────────────────────────────────── */}
            {variants.length > 0 && (
              <div style={{
                display: 'flex',
                borderTop: '1px solid rgba(255,255,255,0.07)',
              }}>
                {variants.map((v, vi) => {
                  const vHex = hslToHex(v.hsl).toUpperCase();
                  const vCss = hslToCss(v.hsl);
                  const vCopied = copiedId === v.id;
                  const vEditing = editingId === v.id;
                  const vLabel = (v.variantDiff?.l ?? 0) >= 0 ? 'tint' : 'shade';
                  const hovered = hoveredVariantId === v.id;

                  return (
                    <div
                      key={v.id}
                      data-swatch-tile="true"
                      style={{
                        flex: '1 1 0',
                        display: 'flex',
                        flexDirection: 'column',
                        borderLeft: vi > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                        cursor: 'pointer',
                        position: 'relative',
                      }}
                      onMouseEnter={() => setHoveredVariantId(v.id)}
                      onMouseLeave={() => setHoveredVariantId(null)}
                      onClick={() => onCopy(vHex, v.id)}
                    >
                      {/* Variant color block */}
                      <div style={{
                        position: 'relative',
                        height: VARIANT_BLOCK_H,
                        backgroundColor: vCss,
                        overflow: 'hidden',
                      }}>
                        {vCopied && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.3)',
                          }}>
                            <Check size={14} strokeWidth={2.5} color="white" />
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

                      {/* Variant label */}
                      <div style={{
                        padding: '5px 6px',
                        background: 'rgba(255,255,255,0.02)',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                      }}>
                        <p style={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: 8,
                          color: 'rgba(255,255,255,0.3)',
                          margin: 0,
                          letterSpacing: '0.04em',
                          textTransform: 'lowercase',
                        }}>
                          {vLabel}
                        </p>
                        <p style={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: 8,
                          color: 'rgba(255,255,255,0.45)',
                          margin: 0,
                          letterSpacing: '0.02em',
                        }}>
                          {vHex}
                        </p>
                      </div>
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

export default ColorCard;
