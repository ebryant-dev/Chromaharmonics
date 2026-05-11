import React, { useRef, useCallback } from 'react';
import { HarmonyType } from '../types';
import { AppMode } from '../App';
import { ChevronDown } from 'lucide-react';

// ── Shared config ─────────────────────────────────────────────────────────────
const MODE_OPTIONS: { value: AppMode; label: string }[] = [
  { value: 'analogous',           label: 'Analogous' },
  { value: 'monochromatic',       label: 'Monochromatic' },
  { value: 'complementary',       label: 'Complementary' },
  { value: 'split-complementary', label: 'Split Complementary' },
  { value: 'triad',               label: 'Triadic' },
  { value: 'compound',            label: 'Tetradic' },
  { value: 'square',              label: 'Square' },
  { value: 'shades',              label: 'Shades & Tints' },
  { value: 'freeform',            label: 'Freeform' },
];

export const ANGLE_CONFIG: Partial<Record<HarmonyType, { min: number; max: number; label: string }>> = {
  analogous:             { min: 10, max: 60,  label: 'Spread' },
  'split-complementary': { min: 0,  max: 90,  label: 'Split Angle' },
  triad:                 { min: 60, max: 150, label: 'Spread' },
  compound:              { min: 15, max: 165, label: 'Spread' },
  monochromatic:         { min: 5,  max: 30,  label: 'Step' },
};

// ── LEFT: Harmony selector ────────────────────────────────────────────────────
interface HarmonySelectorProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  harmony: HarmonyType;
  showDirectComplement: boolean;
  setShowDirectComplement: (v: boolean) => void;
}

export const HarmonySelector: React.FC<HarmonySelectorProps> = ({
  mode, onModeChange, harmony,
  showDirectComplement, setShowDirectComplement,
}) => {
  const isFreeform = mode === 'freeform';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      width: 188,
    }}>
      {/* Section label */}
      <span style={{
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.25)',
        userSelect: 'none',
      }}>
        Harmony
      </span>

      {/* Dropdown */}
      <div style={{ position: 'relative' }}>
        <select
          value={mode}
          onChange={e => onModeChange(e.target.value as AppMode)}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            color: isFreeform ? '#4ade80' : '#e2e8f0',
            fontSize: 13,
            padding: '9px 28px 9px 11px',
            appearance: 'none',
            cursor: 'pointer',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
        >
          {MODE_OPTIONS.map(o => (
            <option
              key={o.value}
              value={o.value}
              style={{ background: '#0f1623', color: o.value === 'freeform' ? '#4ade80' : '#f1f5f9' }}
            >
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={13}
          style={{
            position: 'absolute',
            right: 9,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.3)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* True complement toggle — only for split-complementary */}
      {harmony === 'split-complementary' && (
        <div style={{
          opacity: isFreeform ? 0.25 : 1,
          transition: 'opacity 0.2s',
          pointerEvents: isFreeform ? 'none' : undefined,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          padding: '7px 10px',
          boxSizing: 'border-box' as const,
        }}>
          <Toggle checked={showDirectComplement} onChange={setShowDirectComplement} />
          <div>
            <div style={{ fontSize: 11, color: '#e2e8f0', lineHeight: 1 }}>True Complement</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Add 180° opposite</div>
          </div>
        </div>
      )}

      {/* Freeform note */}
      {isFreeform && (
        <p style={{
          fontSize: 10,
          color: 'rgba(74,222,128,0.65)',
          margin: 0,
          lineHeight: 1.4,
        }}>
          Drag any handle freely —<br />harmony rules suspended
        </p>
      )}
    </div>
  );
};

// ── Vertical slider ───────────────────────────────────────────────────────────
const TRACK_H = 188;
const KNOB_D  = 22;
const KNOB_R  = KNOB_D / 2;
const TICK_CNT = 9;

interface VSliderProps {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}

const VerticalSlider: React.FC<VSliderProps> = ({ value, min, max, label, onChange, disabled }) => {
  const trackRef  = useRef<HTMLDivElement>(null);
  const capturing = useRef(false);

  const pct   = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const knobY = (1 - pct) * TRACK_H;

  const valueFromClientY = useCallback((clientY: number): number => {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    const raw  = 1 - (clientY - rect.top) / rect.height;
    return Math.round(min + Math.max(0, Math.min(1, raw)) * (max - min));
  }, [min, max, value]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    capturing.current = true;
    onChange(valueFromClientY(e.clientY));
  }, [disabled, onChange, valueFromClientY]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!capturing.current || disabled) return;
    onChange(valueFromClientY(e.clientY));
  }, [disabled, onChange, valueFromClientY]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    capturing.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>

      {/* Label above panel */}
      <span style={{
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.25)',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>

      {/* Dark panel */}
      <div style={{
        position: 'relative',
        width: 48,
        borderRadius: 12,
        background: 'linear-gradient(180deg, #18191f 0%, #111318 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.5)',
        padding: '14px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Max label */}
        <span style={{
          fontSize: 9,
          color: 'rgba(255,255,255,0.28)',
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: '0.04em',
          marginBottom: 8,
          userSelect: 'none',
        }}>
          {max}°
        </span>

        {/* Track hit area */}
        <div
          ref={trackRef}
          style={{
            position: 'relative',
            width: '100%',
            height: TRACK_H,
            cursor: disabled ? 'default' : 'ns-resize',
            display: 'flex',
            justifyContent: 'center',
            touchAction: 'none',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* Track background */}
          <div style={{
            position: 'absolute', left: '50%', top: 0, bottom: 0,
            width: 2, transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.07)', borderRadius: 2,
          }} />

          {/* Filled (knob → bottom) */}
          <div style={{
            position: 'absolute', left: '50%',
            top: knobY + KNOB_R, bottom: 0,
            width: 2, transform: 'translateX(-50%)',
            background: 'linear-gradient(to bottom, #818cf8, #6366f1)',
            boxShadow: '0 0 6px 1px rgba(99,102,241,0.55), 0 0 14px 2px rgba(99,102,241,0.2)',
            borderRadius: 2,
          }} />

          {/* Tick marks */}
          {Array.from({ length: TICK_CNT }, (_, i) => {
            const ty      = (i / (TICK_CNT - 1)) * TRACK_H;
            const isMajor = i === 0 || i === TICK_CNT - 1 || i === Math.floor(TICK_CNT / 2);
            return (
              <div key={i} style={{
                position: 'absolute', right: 4, top: ty,
                width: isMajor ? 6 : 4, height: 1,
                background: isMajor ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.10)',
                transform: 'translateY(-50%)', pointerEvents: 'none',
              }} />
            );
          })}

          {/* Knob */}
          <div style={{
            position: 'absolute', left: '50%', top: knobY,
            transform: 'translate(-50%, -50%)',
            width: KNOB_D, height: KNOB_D, borderRadius: '50%',
            background: 'radial-gradient(circle at 38% 36%, #e4e6ef 0%, #9ca0b0 55%, #6b6f80 100%)',
            boxShadow: [
              '0 0 0 1.5px rgba(255,255,255,0.15)',
              '0 2px 6px rgba(0,0,0,0.7)',
              'inset 0 1px 2px rgba(255,255,255,0.35)',
            ].join(', '),
            cursor: disabled ? 'default' : 'grab',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Min label */}
        <span style={{
          fontSize: 9,
          color: 'rgba(255,255,255,0.28)',
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: '0.04em',
          marginTop: 8,
          userSelect: 'none',
        }}>
          {min}°
        </span>
      </div>
    </div>
  );
};

// ── Small toggle ──────────────────────────────────────────────────────────────
interface ToggleProps { checked: boolean; onChange: (v: boolean) => void }
const Toggle: React.FC<ToggleProps> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    role="switch"
    aria-checked={checked}
    style={{
      position: 'relative', width: 30, height: 16,
      flexShrink: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    }}
  >
    <span style={{
      display: 'block', width: 30, height: 16, borderRadius: 8,
      background: checked ? '#f97316' : 'rgba(255,255,255,0.1)',
      transition: 'background 0.2s',
    }} />
    <span style={{
      position: 'absolute', top: 2, left: 2,
      width: 12, height: 12, borderRadius: '50%',
      background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
      transform: checked ? 'translateX(14px)' : 'translateX(0)',
      transition: 'transform 0.2s',
    }} />
  </button>
);

// ── RIGHT: Angle panel (slider only) ─────────────────────────────────────────
interface AnglePanelProps {
  mode: AppMode;
  harmony: HarmonyType;
  angle: number;
  setAngle: (a: number) => void;
}

export const AnglePanel: React.FC<AnglePanelProps> = ({ mode, harmony, angle, setAngle }) => {
  const isFreeform  = mode === 'freeform';
  const angleConfig = ANGLE_CONFIG[harmony] ?? null;

  if (!angleConfig) return null;

  return (
    <div style={{
      opacity: isFreeform ? 0.25 : 1,
      transition: 'opacity 0.2s',
      pointerEvents: isFreeform ? 'none' : undefined,
    }}>
      <VerticalSlider
        value={angle}
        min={angleConfig.min}
        max={angleConfig.max}
        label={angleConfig.label}
        onChange={setAngle}
        disabled={isFreeform}
      />
    </div>
  );
};

// ── Legacy default export (kept for any future use) ───────────────────────────
interface ControlsProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  harmony: HarmonyType;
  angle: number;
  setAngle: (a: number) => void;
  showDirectComplement: boolean;
  setShowDirectComplement: (v: boolean) => void;
}

const Controls: React.FC<ControlsProps> = (props) => (
  <>
    <HarmonySelector
      mode={props.mode}
      onModeChange={props.onModeChange}
      harmony={props.harmony}
      showDirectComplement={props.showDirectComplement}
      setShowDirectComplement={props.setShowDirectComplement}
    />
    <AnglePanel
      mode={props.mode}
      harmony={props.harmony}
      angle={props.angle}
      setAngle={props.setAngle}
    />
  </>
);

export default Controls;
