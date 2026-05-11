import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { HSL, HarmonyType, PaletteColor } from '../types';
import { hslToCss, normalizeHue } from '../utils/color';

interface ColorWheelProps {
  baseColor: HSL;
  palette: PaletteColor[];
  onBaseColorChange: (hsl: HSL) => void;
  onAngleChange: (angle: number) => void;
  harmonyAngle: number;
  harmony: HarmonyType;
  isFreeform: boolean;
  onColorUpdate: (id: string, hsl: HSL) => void;
}

// ── Geometry constants ──────────────────────────────────────────
const SIZE     = 480;
const CX       = SIZE / 2;
const CY       = SIZE / 2;
const OUTER_R  = 200;
const INNER_R  = 150;          // thinner ring (50px wide, was 68px)
const HANDLE_R = INNER_R;      // handles on inner edge of ring
const CENTER_DOT_R = 14;       // larger hub

// Convert HSL hue (0–360) → canvas angle in radians
// hue 0 (red) → right (east), rotating clockwise
const hueToRad = (hue: number) => (hue * Math.PI) / 180;

// Canvas angle → hue
const radToHue = (rad: number) => normalizeHue((rad * 180) / Math.PI);

// Handle position on the ring
const handlePos = (hue: number, r = HANDLE_R) => ({
  x: CX + r * Math.cos(hueToRad(hue)),
  y: CY + r * Math.sin(hueToRad(hue)),
});

// SVG arc path between two hues (clockwise)
const arcPath = (r: number, hue1: number, hue2: number): string => {
  const a1 = hueToRad(hue1);
  const a2 = hueToRad(hue2);
  const x1 = CX + r * Math.cos(a1);
  const y1 = CY + r * Math.sin(a1);
  const x2 = CX + r * Math.cos(a2);
  const y2 = CY + r * Math.sin(a2);
  // Determine shorter arc
  let diff = normalizeHue(hue2 - hue1);
  const largeArc = diff > 180 ? 1 : 0;
  const sweep = 1; // always clockwise in canvas coords
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

// ── Draw the ring on canvas ─────────────────────────────────────
function drawRing(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Draw 720 arc slices for a smooth ring
  for (let i = 0; i < 720; i++) {
    const startAngle = ((i - 0.5) / 720) * Math.PI * 2;
    const endAngle   = ((i + 0.5) / 720) * Math.PI * 2;
    const hue = (i / 720) * 360;

    ctx.beginPath();
    ctx.arc(CX, CY, OUTER_R, startAngle, endAngle);
    ctx.arc(CX, CY, INNER_R, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fill();
  }

  // Outer edge highlight
  ctx.beginPath();
  ctx.arc(CX, CY, OUTER_R, 0, Math.PI * 2);
  const outerGrad = ctx.createRadialGradient(CX, CY, OUTER_R - 6, CX, CY, OUTER_R + 2);
  outerGrad.addColorStop(0, 'rgba(255,255,255,0)');
  outerGrad.addColorStop(1, 'rgba(255,255,255,0.18)');
  ctx.fillStyle = outerGrad;
  ctx.fill();

  // Inner edge shadow
  ctx.beginPath();
  ctx.arc(CX, CY, INNER_R, 0, Math.PI * 2);
  const innerGrad = ctx.createRadialGradient(CX, CY, INNER_R - 2, CX, CY, INNER_R + 10);
  innerGrad.addColorStop(0, 'rgba(0,0,0,0.55)');
  innerGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = innerGrad;
  ctx.fill();

  // Dark center fill
  ctx.beginPath();
  ctx.arc(CX, CY, INNER_R - 1, 0, Math.PI * 2);
  ctx.fillStyle = '#080b10';
  ctx.fill();
}

// ── Component ───────────────────────────────────────────────────
const ColorWheel: React.FC<ColorWheelProps> = ({
  baseColor,
  palette,
  onBaseColorChange,
  onAngleChange,
  harmonyAngle,
  harmony,
  isFreeform,
  onColorUpdate,
}) => {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  // Draw ring once on mount
  useEffect(() => {
    if (canvasRef.current) drawRing(canvasRef.current);
  }, []);

  // Only primary (non-variant) colors get handles on the wheel
  const wheelColors = useMemo(
    () => palette.filter(c => !c.label.includes('(Variant)')),
    [palette]
  );

  // ── Pointer interaction ────────────────────────────────────────
  const getHueFromPointer = useCallback((clientX: number, clientY: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const scale = SIZE / rect.width;           // handle CSS-scaled canvas
    const px = (clientX - rect.left)  * scale;
    const py = (clientY - rect.top)   * scale;
    const dx = px - CX;
    const dy = py - CY;
    return radToHue(Math.atan2(dy, dx));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(id);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;

    const newHue = getHueFromPointer(e.clientX, e.clientY);
    const activeColor = palette.find(c => c.id === dragging);
    if (!activeColor) return;

    if (isFreeform) {
      onColorUpdate(activeColor.id, { ...activeColor.hsl, h: newHue });
      return;
    }

    if (activeColor.isBase || activeColor.angleOffset === 0) {
      // Rotate entire palette — update base hue
      onBaseColorChange({ ...baseColor, h: newHue });
    } else {
      // Adjust harmony spread
      let diff = newHue - baseColor.h;
      if (diff < 0) diff += 360;
      if (diff > 180) diff = 360 - diff;
      onAngleChange(Math.round(diff));
    }
  }, [dragging, palette, isFreeform, baseColor, getHueFromPointer, onBaseColorChange, onAngleChange, onColorUpdate]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setDragging(null);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // ── SVG geometry: lines + dashed arc ─────────────────────────
  const geometryLines = useMemo(() => {
    return wheelColors.map(c => {
      const p = handlePos(c.hsl.h);
      return (
        <line
          key={`line-${c.id}`}
          x1={p.x} y1={p.y}
          x2={CX}  y2={CY}
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      );
    });
  }, [wheelColors]);

  // Dashed arc between the two non-base harmony handles (if they exist)
  const dashedArc = useMemo(() => {
    const harmonies = wheelColors.filter(c => !c.isBase && c.angleOffset !== 0);
    if (harmonies.length < 2) return null;

    const h1    = harmonies[0].hsl.h;
    const h2    = harmonies[harmonies.length - 1].hsl.h;
    const arcR  = HANDLE_R * 0.72;
    const arcColor = 'rgba(255,255,255,0.45)';

    // ── Shared helpers ──────────────────────────────────────────────────────
    const arrowLen = 7;
    const arrow = (hue: number, clockwise: boolean) => {
      const a  = hueToRad(hue);
      const t  = clockwise ? a + Math.PI / 2 : a - Math.PI / 2;
      const ax = CX + arcR * Math.cos(a);
      const ay = CY + arcR * Math.sin(a);
      return [[ax, ay],
        [ax - arrowLen * Math.cos(t - 0.4), ay - arrowLen * Math.sin(t - 0.4)],
        [ax - arrowLen * Math.cos(t + 0.4), ay - arrowLen * Math.sin(t + 0.4)],
      ].map(p => p.map(n => n.toFixed(2)).join(',')).join(' ');
    };

    const dashedPath = (d: string) => (
      <path d={d} fill="none" stroke={arcColor} strokeWidth="1" strokeDasharray="4 3" />
    );
    const arrowPoly = (hue: number, cw: boolean) => (
      <polygon points={arrow(hue, cw)} fill={arcColor} />
    );
    const label = (hue: number, text: string, r = arcR - 22) => {
      const rad = hueToRad(hue);
      return (
        <text
          x={(CX + r * Math.cos(rad)).toFixed(2)}
          y={(CY + r * Math.sin(rad)).toFixed(2)}
          textAnchor="middle" dominantBaseline="central"
          fill="rgba(255,255,255,0.70)" fontSize="11"
          fontFamily="Inter, system-ui, sans-serif" fontWeight="500" letterSpacing="-0.02em"
        >{text}</text>
      );
    };
    const midHue = (from: number, span: number) => normalizeHue(from + span / 2);

    // ── Split-complementary ─────────────────────────────────────────────────
    // Two arcs flanking the true complement, each labeled with the split angle.
    // Arrows at all four endpoints; a dashed radial segment marks the complement axis.
    if (harmony === 'split-complementary') {
      const complHue = normalizeHue(baseColor.h + 180);
      const aCompl   = hueToRad(complHue);
      const path1    = arcPath(arcR, h1, complHue);
      const path2    = arcPath(arcR, complHue, h2);

      return (
        <g>
          {/* Radial separator at the true-complement axis */}
          <line
            x1={CX} y1={CY}
            x2={(CX + arcR * Math.cos(aCompl)).toFixed(2)}
            y2={(CY + arcR * Math.sin(aCompl)).toFixed(2)}
            stroke={arcColor} strokeWidth="1" strokeDasharray="4 3"
          />
          {dashedPath(path1)}
          {dashedPath(path2)}
          {/* Four arrowheads — one at each endpoint of each arc */}
          {arrowPoly(h1,       false)} {/* arc1 start, CCW */}
          {arrowPoly(complHue, true)}  {/* arc1 end,   CW  */}
          {arrowPoly(complHue, false)} {/* arc2 start, CCW */}
          {arrowPoly(h2,       true)}  {/* arc2 end,   CW  */}
          {label(midHue(h1,       harmonyAngle), `${harmonyAngle}°`)}
          {label(midHue(complHue, harmonyAngle), `${harmonyAngle}°`)}
        </g>
      );
    }

    // ── Compound (Tetradic) ─────────────────────────────────────────────────
    // Two paired arcs: Base→Adjacent and Complement→FarAdjacent, each X°.
    if (harmony === 'compound') {
      const baseH      = baseColor.h;
      const adjHue     = h1;                          // harmonies[0] = Adjacent
      const complHue   = normalizeHue(baseH + 180);
      const farAdjHue  = h2;                          // harmonies[last] = Far Adjacent
      const path1      = arcPath(arcR, baseH,    adjHue);
      const path2      = arcPath(arcR, complHue, farAdjHue);

      return (
        <g>
          {dashedPath(path1)}
          {dashedPath(path2)}
          {arrowPoly(baseH,      false)}
          {arrowPoly(adjHue,     true)}
          {arrowPoly(complHue,   false)}
          {arrowPoly(farAdjHue,  true)}
          {label(midHue(baseH,    harmonyAngle), `${harmonyAngle}°`)}
          {label(midHue(complHue, harmonyAngle), `${harmonyAngle}°`)}
        </g>
      );
    }

    // ── Square ──────────────────────────────────────────────────────────────
    // Four 90° arcs forming a full dashed ring, each labeled "90°".
    if (harmony === 'square') {
      const baseH = baseColor.h;
      const sq1   = harmonies[0].hsl.h;
      const sq2   = harmonies[1].hsl.h;
      const sq3   = harmonies[2].hsl.h;
      const segs  = [
        { from: baseH, to: sq1 },
        { from: sq1,   to: sq2 },
        { from: sq2,   to: sq3 },
        { from: sq3,   to: baseH },
      ];
      return (
        <g>
          {segs.map(({ from, to }, i) => (
            <g key={i}>
              {dashedPath(arcPath(arcR, from, to))}
              {label(midHue(from, 90), '90°')}
            </g>
          ))}
        </g>
      );
    }

    // ── Triadic ─────────────────────────────────────────────────────────────
    // Swap endpoints so the clockwise arc passes through base instead of complement.
    // Label at ¼ of the arc — halfway between a triad handle and the base spoke.
    const [dh1, dh2] = harmony === 'triad' ? [h2, h1] : [h1, h2];
    const path       = arcPath(arcR, dh1, dh2);
    const span       = normalizeHue(dh2 - dh1);

    let labelHue: number;
    if (harmony === 'triad') {
      labelHue = normalizeHue(dh1 + span / 4);
    } else {
      const isSmall = harmonyAngle < 20;
      labelHue = isSmall
        ? normalizeHue(midHue(dh1, span) - (harmonyAngle + 12))
        : midHue(dh1, span);
    }
    const labelRadius = harmony === 'triad' ? arcR - 26 : (harmonyAngle < 20 ? arcR + 6 : arcR - 26);

    return (
      <g>
        {dashedPath(path)}
        {arrowPoly(dh2, true)}
        {arrowPoly(dh1, false)}
        {label(labelHue, `${harmonyAngle}°`, labelRadius)}
      </g>
    );
  }, [wheelColors, harmonyAngle, harmony, baseColor.h]);

  // ── Handles ───────────────────────────────────────────────────
  // Handles float just outside the ring on the dark background so the
  // fill color + glow are clearly readable regardless of the ring hue.
  const handles = useMemo(() => {
    return wheelColors.map(color => {
      const pos = handlePos(color.hsl.h);
      const isBase = color.isBase;
      const css = hslToCss(color.hsl);
      const popCss = `hsl(${Math.round(color.hsl.h)}, ${Math.min(100, color.hsl.s + 8)}%, ${Math.min(68, color.hsl.l + 6)}%)`;
      const size = isBase ? 38 : 34;
      const half = size / 2;
      const borderW = isBase ? 3.5 : 3;
      const isDraggingThis = dragging === color.id;

      return (
        <div
          key={color.id}
          onPointerDown={e => handlePointerDown(e, color.id)}
          style={{
            position: 'absolute',
            left: pos.x - half,
            top:  pos.y - half,
            width:  size,
            height: size,
            borderRadius: '50%',
            backgroundColor: popCss,
            border: `${borderW}px solid rgba(255,255,255,${isBase ? 0.95 : 0.88})`,
            filter: [
              `drop-shadow(0px 4px 10px rgba(0,0,0,0.50))`,
              `drop-shadow(0px 1px 3px rgba(0,0,0,0.30))`,
            ].join(' '),
            cursor: isDraggingThis ? 'grabbing' : 'grab',
            transform: isDraggingThis ? 'scale(1.18)' : 'scale(1)',
            transition: isDraggingThis ? 'none' : 'transform 0.15s ease',
            zIndex: isBase ? 20 : 10,
            userSelect: 'none',
          }}
          title={color.label}
        />
      );
    });
  }, [wheelColors, dragging, handlePointerDown]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: SIZE, height: SIZE, maxWidth: '100%' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Ring canvas */}
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        style={{ display: 'block', width: '100%', height: '100%', borderRadius: '50%' }}
      />

      {/* SVG geometry overlay */}
      <svg
        width={SIZE}
        height={SIZE}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%' }}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
      >
        <defs>
          {/* Directional drop shadow — dy=4 matches the handle drop-shadow(0px 4px) angle */}
          <filter id="hub-shadow" x="-150%" y="-150%" width="400%" height="400%">
            <feDropShadow dx="0" dy="4" stdDeviation="5"
              floodColor="#000" floodOpacity="0.55" />
          </filter>
        </defs>

        {/* Spokes — drawn first so hub renders on top */}
        {geometryLines}
        {dashedArc}

        {/* Hub — single circle with the drop-shadow filter applied */}
        <circle
          cx={CX} cy={CY} r={CENTER_DOT_R}
          fill="#1e2130"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.5"
          filter="url(#hub-shadow)"
        />
        {/* Subtle top-left highlight on hub face */}
        <circle
          cx={CX - CENTER_DOT_R * 0.28}
          cy={CY - CENTER_DOT_R * 0.28}
          r={CENTER_DOT_R * 0.45}
          fill="rgba(255,255,255,0.07)"
        />
      </svg>

      {/* Draggable handles */}
      {handles}

    </div>
  );
};

export default ColorWheel;
