# ChromaHarmonics - Project Specifications

## 1. Executive Summary
**ChromaHarmonics** is an advanced, interactive color palette generator intended for UI/UX designers and artists. Unlike basic generators that only provide fixed mathematical matches, ChromaHarmonics acts as a professional instrument: it calculates complex color harmonies while giving designers fine-grained, tiered adjustability over saturation, lightness, and angular spread, culminating in an unconstrained "Freeform" mode.

## 2. Core Vision & Goals
* **Fluid Interactivity:** Provide a frictionless visual interface (Color Wheel) where color theory can be manipulated practically.
* **Complex Tiered Palettes:** Generate not just 3-4 flat colors, but robust UI palettes by deriving secondary and tertiary variants using relative offsets.
* **Algorithmic vs. Manual Flexibility:** Give users mathematical perfection when they want it, and complete unstructured control when they need to manually adjust the output.

---

## 3. Feature Specifications

### 3.1 Interactive Color Wheel (The Canvas)
* **Visual Rendering:** An HTML5 Canvas or SVG-based wheel displaying the full hue spectrum fully saturated at the edges to white in the center.
* **Control Handles:** Floating nodes on the wheel corresponding to palette colors.
  * *Base Node:* Manipulates the primary Hue and Saturation of the entire palette. 
  * *Harmony Nodes:* Dragging these handles adjusts the angular spread (e.g., widening an analogous palette).
* **Real-time Dragging:** Updates state seamlessly, recalculating all derived colors dynamically.

### 3.2 Dynamic Color Harmonies
Provides mathematical offset presets corresponding to standard color theory:
* **Analogous:** Base color plus two adjacent colors.
* **Monochromatic:** Gradient variance of the base hue in saturation/lightness.
* **Complementary:** Base plus the direct opposite (180°).
* **Split Complementary:** Base plus two colors adjacent to its complement.
* **Triadic:** Three equidistant colors on the wheel.
* **Compound (Tetradic) & Square:** Four-color geometries.
* **Shades & Tints:** Fixed-hue lightness scaling.

### 3.3 Advanced Tiered Shifting (The Generator Engine)
Instead of generating a raw harmony, the app generates a *production-ready* palette using tiered shifts.
* **Secondary Color Shifts:** Sliders to independently shift the Lightness (L) and Saturation (S) of harmony-derived colors relative to the base color (e.g., keeping the base saturated, but washing out the harmony matches).
* **Tertiary Colors (Variants):** The system automatically generates a variant (tertiary hue) for every primary node (base and secondary). Users can control global Saturation and Lightness shifts for these variants to establish ready-to-use highlight/shadow pairs.

### 3.4 Harmony-Specific Tools
* **Angular Spread Control:** A slider and wheel-drag interaction to change the standard angles (e.g., widening a Triad from 120° to 150°).
* **Direct Complement Toggle:** Specific to Split-Complementary harmony, allowing the user to inject the direct opposite color (180°) into the calculation, with independent Saturation and Lightness sliders just for that node.

### 3.5 Freeform Mode
* A breakaway feature that detaches the math from the visualizer.
* Taking a "snapshot" of the currently calculated palette, it converts all items to independent nodes.
* Designers can drag any single color on the wheel without affecting the geometric positioning of the rest of the palette.

### 3.6 Interface & Controls
* **Manual Inputs:** Syncing Hex text inputs and raw number inputs for H, S, and L parameters to dictate absolute base colors.
* **Theme & UI:** A sleek, dark-mode application (Tailwind `slate-950`) maximizing contrast for the colored elements. 
* **Palette Display Layout:** A visual list translating the internal palette state into viewable swatches with copyable formats.

---

## 4. Technical Architecture Requirements

### 4.1 Tech Stack
* **Frontend Framework:** React 18+ (Functional components, React Hooks).
* **Build System:** Vite.
* **Styling:** Tailwind CSS for structural and component styling.
* **Icons:** Lucide React.
* **Language:** TypeScript for strict domain modeling of color types.

### 4.2 State Management
The application must rely on a cascading derived state model:
1. **Primary State:** `baseColor` (HSL), `harmony` type, `angle`.
2. **Shift States:** `secondaryDiffs`, `tertiaryDiffs`, `directComplementDiffs`.
3. **Derived State:** `generatedPalette` generated via a pure function using the above parameters.
4. **Override State:** If `isFreeform` is true, display a mutable `customPalette` memory state instead of the dynamically derived one.

### 4.3 Data Structures
```typescript
interface HSL {
  h: number; // 0 - 360
  s: number; // 0 - 100
  l: number; // 0 - 100
}

interface PaletteColor {
  id: string;
  label: string;
  hsl: HSL;
  isBase: boolean;
  angleOffset: number;
}
```

## 5. Future Considerations (Out of Initial Scope)
* **Exporting:** CSS variable generation, SCSS token exports, and Figma JSON tokens.
* **Accessibility Checker:** Real-time contrast checks between generated base colors and their tertiary variants against WCAG standards.
