import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ColorWheel from './components/ColorWheel';
import { HarmonySelector, AnglePanel } from './components/Controls';
import PaletteDisplay, { groupPalette } from './components/PaletteDisplay';
import { HSL, HarmonyType, PaletteColor, VariantSpec, SwatchStyle } from './types';
import { generatePalette, hslToHex, hslToCss, hexToRgb } from './utils/color';
import { Copy, Download, FileImage, FileCode2, Check } from 'lucide-react';

export type AppMode = HarmonyType | 'freeform';

// These two heights must sum to what we subtract from 100vh for the main area.
// HEADER_H + PALETTE_BASE_H = the minimum "non-wheel" vertical space.
const HEADER_H      = 54;   // px — explicit header height
const PALETTE_BASE_H = 110; // px — PRIMARY_H in PaletteDisplay (primary-only row)

const DEFAULT_ANGLES: Partial<Record<HarmonyType, number>> = {
  analogous:             30,
  'split-complementary': 30,
  triad:                120,
  compound:              45,
  monochromatic:         15,
};

const App: React.FC = () => {
  // ── Core state ─────────────────────────────────────────────────────────────
  const [baseColor, setBaseColor] = useState<HSL>({ h: 210, s: 75, l: 50 });
  const [mode, setMode]           = useState<AppMode>('split-complementary');
  const [angle, setAngle]         = useState(30);

  const [groupPrimaryDiffs, setGroupPrimaryDiffs] = useState<Array<{ h: number; s: number; l: number }>>([
    { h: 0, s: 0, l: 0 },
    { h: 0, s: 0, l: 0 },
    { h: 0, s: 0, l: 0 },
    { h: 0, s: 0, l: 0 },
  ]);

  const [groupVariants, setGroupVariants] = useState<VariantSpec[][]>([[], [], [], []]);
  const [showDirectComplement, setShowDirectComplement] = useState(false);

  const [customPalette, setCustomPalette] = useState<PaletteColor[]>([]);
  const [exportCopiedId, setExportCopiedId] = useState<string | null>(null);
  const [swatchStyle, setSwatchStyle] = useState<SwatchStyle>('overlay');
  void setSwatchStyle; // future: wire to Controls selector

  // Track total variant count so we can detect additions and scroll to reveal them
  const prevVariantCount = useRef(0);
  useEffect(() => {
    const total = groupVariants.reduce((sum, g) => sum + g.length, 0);
    if (total > prevVariantCount.current) {
      // Wait two animation frames: first for React to commit the new DOM,
      // second for the browser to finish layout so scrollHeight is accurate.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        });
      });
    }
    prevVariantCount.current = total;
  }, [groupVariants]);
  const lastHarmonyRef = useRef<HarmonyType>('split-complementary');

  // ── Derived ────────────────────────────────────────────────────────────────
  const isFreeform = mode === 'freeform';
  const harmony: HarmonyType = isFreeform ? lastHarmonyRef.current : (mode as HarmonyType);

  const generatedPalette = useMemo(
    () => generatePalette(baseColor, harmony, angle, groupPrimaryDiffs, groupVariants, showDirectComplement),
    [baseColor, harmony, angle, groupPrimaryDiffs, groupVariants, showDirectComplement]
  );

  const displayedPalette = isFreeform ? customPalette : generatedPalette;

  // ── Updaters ───────────────────────────────────────────────────────────────
  const updateGroupPrimaryDiff = (idx: number, diff: { h: number; s: number; l: number }) => {
    setGroupPrimaryDiffs(prev => { const n = [...prev]; n[idx] = diff; return n; });
  };

  const addVariant = (groupIndex: number, defaultDiff: { s: number; l: number }) => {
    const id = `v-${groupIndex}-${Date.now()}`;
    setGroupVariants(prev => {
      const n = prev.map(g => [...g]);
      n[groupIndex] = [...n[groupIndex], { id, ...defaultDiff }];
      return n;
    });
  };

  const updateVariant = (groupIndex: number, variantId: string, diff: { s: number; l: number }) => {
    setGroupVariants(prev => {
      const n = prev.map(g => [...g]);
      n[groupIndex] = n[groupIndex].map(v => v.id === variantId ? { ...v, ...diff } : v);
      return n;
    });
  };

  const removeVariant = (groupIndex: number, variantId: string) => {
    setGroupVariants(prev => {
      const n = prev.map(g => [...g]);
      n[groupIndex] = n[groupIndex].filter(v => v.id !== variantId);
      return n;
    });
  };

  // ── Mode handlers ──────────────────────────────────────────────────────────
  const handleModeChange = (newMode: AppMode) => {
    if (newMode === 'freeform') {
      setCustomPalette([...generatedPalette]);
    } else {
      const h = newMode as HarmonyType;
      lastHarmonyRef.current = h;
      if (DEFAULT_ANGLES[h] !== undefined) setAngle(DEFAULT_ANGLES[h]!);
    }
    setMode(newMode);
  };

  const handleColorUpdate = (id: string, newHsl: HSL) => {
    if (!isFreeform) return;
    setCustomPalette(prev => prev.map(c => c.id === id ? { ...c, hsl: newHsl } : c));
    const moved = customPalette.find(c => c.id === id);
    if (moved?.isBase) setBaseColor(newHsl);
  };

  // ── Export actions ─────────────────────────────────────────────────────────
  const exportGroups = useMemo(() => groupPalette(displayedPalette), [displayedPalette]);

  const copyAllHex = useCallback(() => {
    const text = exportGroups.map(g => hslToHex(g.primary.hsl).toUpperCase()).join('\n');
    navigator.clipboard.writeText(text);
    setExportCopiedId('__all__');
    setTimeout(() => setExportCopiedId(null), 1600);
  }, [exportGroups]);

  const downloadJSON = useCallback(() => {
    const data = JSON.stringify(
      exportGroups.map(g => ({
        label: g.primary.label,
        hex:   hslToHex(g.primary.hsl).toUpperCase(),
        hsl:   g.primary.hsl,
        ...(g.variants.length ? {
          variants: g.variants.map(v => ({
            type: (v.variantDiff?.l ?? 0) >= 0 ? 'tint' : 'shade',
            hex:  hslToHex(v.hsl).toUpperCase(),
            hsl:  v.hsl,
          })),
        } : {}),
      })),
      null, 2
    );
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    Object.assign(document.createElement('a'), { href: url, download: 'chroma-palette.json' }).click();
    URL.revokeObjectURL(url);
  }, [exportGroups]);

  // ── Shared export layout helpers ───────────────────────────────────────────
  // Color Card layout: equal-height cells, grouped by harmony column.
  // Primary + variants all same cell height (equal footing).
  const EXPORT = {
    PAD:      24,
    CARD_W:   200,
    COLOR_H:  150,
    INFO_H:   96,
    GROUP_GAP: 2,
  } as const;

  const exportLayout = useCallback(() => {
    const { PAD, CARD_W, COLOR_H, INFO_H, GROUP_GAP } = EXPORT;
    const CELL_H = COLOR_H + INFO_H;
    const maxCells = Math.max(...exportGroups.map(g => 1 + g.variants.length));
    const W = PAD * 2 + exportGroups.length * CARD_W + (exportGroups.length - 1) * GROUP_GAP;
    const H = PAD * 2 + maxCells * CELL_H;
    return { W, H, CELL_H };
  }, [exportGroups]);

  const drawExportCell = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    hsl: { h: number; s: number; l: number },
    label: string,
    isBase: boolean,
  ) => {
    const { CARD_W, COLOR_H, INFO_H } = EXPORT;
    const CELL_H = COLOR_H + INFO_H;
    const hex = hslToHex(hsl).toUpperCase();
    const { r, g, b } = hexToRgb(hex);

    // Color block
    ctx.fillStyle = hslToCss(hsl);
    ctx.fillRect(x, y, CARD_W, COLOR_H);

    // Info panel background
    ctx.fillStyle = '#111827';
    ctx.fillRect(x, y + COLOR_H, CARD_W, INFO_H);

    // Separator line
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y + COLOR_H); ctx.lineTo(x + CARD_W, y + COLOR_H); ctx.stroke();

    const tx = x + 12;
    // Label
    ctx.fillStyle = isBase ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.35)';
    ctx.font = '500 9px Inter, system-ui, sans-serif';
    ctx.fillText(label.toUpperCase(), tx, y + COLOR_H + 18);

    // Hex
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.fillText(hex, tx, y + COLOR_H + 38);

    // Separator
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.moveTo(tx, y + COLOR_H + 48); ctx.lineTo(x + CARD_W - 12, y + COLOR_H + 48); ctx.stroke();

    // RGB + HSL
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`RGB  ${r}, ${g}, ${b}`, tx, y + COLOR_H + 65);
    ctx.fillText(`HSL  ${Math.round(hsl.h)}°, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%`, tx, y + COLOR_H + 82);

    return CELL_H;
  }, [exportGroups]);

  const downloadImage = useCallback(() => {
    const { PAD, CARD_W, GROUP_GAP } = EXPORT;
    const { W, H, CELL_H } = exportLayout();

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#080b10';
    ctx.fillRect(0, 0, W, H);

    exportGroups.forEach(({ primary, variants }, gi) => {
      const x = PAD + gi * (CARD_W + GROUP_GAP);
      let y = PAD;

      drawExportCell(ctx, x, y, primary.hsl, primary.label, primary.isBase);
      y += CELL_H;

      variants.forEach(v => {
        const vLabel = (v.variantDiff?.l ?? 0) >= 0 ? 'tint' : 'shade';
        drawExportCell(ctx, x, y, v.hsl, vLabel, false);
        y += CELL_H;
      });

      // Group separator
      if (gi > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = GROUP_GAP;
        ctx.beginPath(); ctx.moveTo(x, PAD); ctx.lineTo(x, H - PAD); ctx.stroke();
      }
    });

    Object.assign(document.createElement('a'), {
      href: canvas.toDataURL('image/png'),
      download: 'chroma-palette.png',
    }).click();
  }, [exportGroups, exportLayout, drawExportCell]);

  const downloadSVG = useCallback(() => {
    const { PAD, CARD_W, COLOR_H, INFO_H, GROUP_GAP } = EXPORT;
    const CELL_H = COLOR_H + INFO_H;
    const { W, H } = exportLayout();

    const cells: string[] = [];

    exportGroups.forEach(({ primary, variants }, gi) => {
      const x = PAD + gi * (CARD_W + GROUP_GAP);
      let y = PAD;

      const renderCell = (hsl: { h: number; s: number; l: number }, label: string, isBase: boolean) => {
        const hex = hslToHex(hsl).toUpperCase();
        const { r, g, b } = hexToRgb(hex);
        const tx = x + 12;
        cells.push(`
  <g>
    <rect x="${x}" y="${y}" width="${CARD_W}" height="${COLOR_H}" fill="${hslToCss(hsl)}"/>
    <rect x="${x}" y="${y + COLOR_H}" width="${CARD_W}" height="${INFO_H}" fill="#111827"/>
    <line x1="${x}" y1="${y + COLOR_H}" x2="${x + CARD_W}" y2="${y + COLOR_H}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <text x="${tx}" y="${y + COLOR_H + 18}" font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="500" fill="${isBase ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.35)'}" letter-spacing="1">${label.toUpperCase()}</text>
    <text x="${tx}" y="${y + COLOR_H + 38}" font-family="'JetBrains Mono', 'Courier New', monospace" font-size="13" font-weight="600" fill="rgba(255,255,255,0.88)">${hex}</text>
    <line x1="${tx}" y1="${y + COLOR_H + 48}" x2="${x + CARD_W - 12}" y2="${y + COLOR_H + 48}" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
    <text x="${tx}" y="${y + COLOR_H + 65}" font-family="'JetBrains Mono', 'Courier New', monospace" font-size="10" fill="rgba(255,255,255,0.42)">RGB  ${r}, ${g}, ${b}</text>
    <text x="${tx}" y="${y + COLOR_H + 82}" font-family="'JetBrains Mono', 'Courier New', monospace" font-size="10" fill="rgba(255,255,255,0.42)">HSL  ${Math.round(hsl.h)}°, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%</text>
  </g>`);
        y += CELL_H;
      };

      renderCell(primary.hsl, primary.label, primary.isBase);
      variants.forEach(v => {
        renderCell(v.hsl, (v.variantDiff?.l ?? 0) >= 0 ? 'tint' : 'shade', false);
      });
    });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#080b10"/>
${cells.join('\n')}
</svg>`;

    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    Object.assign(document.createElement('a'), { href: url, download: 'chroma-palette.svg' }).click();
    URL.revokeObjectURL(url);
  }, [exportGroups, exportLayout]);

  return (
    /*
     * Layout strategy:
     *   • Root: min-height 100vh, no overflow restriction → page scrolls naturally
     *   • Header: sticky, exact HEADER_H px, dark bg so content scrolls behind cleanly
     *   • Main (wheel + controls): fixed height = 100vh − HEADER_H − PALETTE_BASE_H
     *     so the primary palette row is always visible on first load.
     *     minHeight: 260px guards against very short viewports.
     *   • Palette: flex-shrink-0, no height cap → grows as variants are added,
     *     pushing the total page height beyond 100vh and triggering native scroll.
     */
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#080b10',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 flex-shrink-0"
        style={{
          height: HEADER_H,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#080b10',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              width: 30, height: 30,
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              boxShadow: '0 0 14px rgba(99,102,241,0.4)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" fill="none"/>
              <circle cx="9" cy="9" r="3.5" stroke="white" strokeWidth="1.5" fill="none"/>
              <circle cx="9" cy="2" r="1.5" fill="white"/>
              <circle cx="15.6" cy="12.5" r="1.5" fill="white"/>
              <circle cx="2.4" cy="12.5" r="1.5" fill="white"/>
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100 leading-tight">ChromaHarmonics</h1>
            <p className="text-[10px] text-slate-600">Color Harmony Generator</p>
          </div>
        </div>

        {/* ── Export buttons ──────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {([
            { icon: <Copy size={13} />,       fn: copyAllHex,    id: '__all__',  title: 'Copy all hex values' },
            { icon: <Download size={13} />,   fn: downloadJSON,  id: '__json__', title: 'Download JSON'       },
            { icon: <FileImage size={13} />,  fn: downloadImage, id: '__png__',  title: 'Download PNG'        },
            { icon: <FileCode2 size={13} />,  fn: downloadSVG,   id: '__svg__',  title: 'Download SVG'        },
          ] as const).map(btn => (
            <button
              key={btn.id}
              onClick={btn.fn}
              title={btn.title}
              className="flex items-center justify-center rounded-lg transition-colors"
              style={{
                width: 30, height: 30,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: exportCopiedId === btn.id ? '#4ade80' : 'rgba(255,255,255,0.35)',
              }}
            >
              {exportCopiedId === btn.id ? <Check size={13} /> : btn.icon}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main area: wheel + controls ───────────────────────────────────── */}
      {/* Fixed height so the wheel never gets cropped when the palette grows  */}
      <div
        className="flex-shrink-0 flex items-center"
        style={{
          height: `calc(100vh - ${HEADER_H + PALETTE_BASE_H}px)`,
          minHeight: 260,
          overflow: 'hidden',
        }}
      >
        {/*
         * Three-column layout: left (flex:1) | wheel (fixed) | right (flex:1)
         * The wheel occupies the true horizontal centre of the viewport.
         * Left zone is right-aligned; right zone is left-aligned.
         */}

        {/* LEFT zone — right-align contents toward the wheel */}
        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingRight: 40,
        }}>
          <HarmonySelector
            mode={mode}
            onModeChange={handleModeChange}
            harmony={harmony}
            showDirectComplement={showDirectComplement}
            setShowDirectComplement={setShowDirectComplement}
          />
        </div>

        {/* CENTER — color wheel, fixed size, truly centered */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            className="absolute pointer-events-none"
            style={{
              inset: -30,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
            }}
          />
          <ColorWheel
            baseColor={baseColor}
            palette={displayedPalette}
            onBaseColorChange={setBaseColor}
            onAngleChange={setAngle}
            harmonyAngle={angle}
            harmony={harmony}
            isFreeform={isFreeform}
            onColorUpdate={handleColorUpdate}
          />
        </div>

        {/* RIGHT zone — left-align contents toward the wheel */}
        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingLeft: 40,
        }}>
          <AnglePanel
            mode={mode}
            harmony={harmony}
            angle={angle}
            setAngle={setAngle}
          />
        </div>
      </div>

      {/* ── Palette ───────────────────────────────────────────────────────── */}
      {/* flex-shrink-0 + no height cap: grows as variants are added,         */}
      {/* the page (body) scrolls naturally.                                  */}
      <div
        className="flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <PaletteDisplay
          palette={displayedPalette}
          isFreeform={isFreeform}
          baseColor={baseColor}
          onBaseColorChange={setBaseColor}
          groupPrimaryDiffs={groupPrimaryDiffs}
          onGroupPrimaryDiffChange={updateGroupPrimaryDiff}
          onAddVariant={addVariant}
          onUpdateVariant={updateVariant}
          onRemoveVariant={removeVariant}
          swatchStyle={swatchStyle}
        />
      </div>
    </div>
  );
};

export default App;
