# Frontend Specification Mining Report

**Agent**: `spec_miner_survey_1` (Frontend Spec Miner)  
**Date**: 2026-10-08T20:46:00Z  
**Parent Agent ID**: `25b12c54-d8ab-4169-b761-55fa46347b92`  
**Working Directory**: `/Users/johnathanhare/materials-dashboard/.agents/teamwork/spec_miner_survey_1`  
**Target Codebase**: `/Users/johnathanhare/materials-dashboard`  

---

## Executive Summary

This report establishes the complete, authoritative specification for the material dataset (`data.json`) required by the Recharts Ashby chart dashboard in `/Users/johnathanhare/materials-dashboard`. By analyzing `app/page.tsx`, `app/actions.ts`, `package.json`, `tsconfig.json`, and Next.js 16 App Router mechanics, we have mapped every required property, casing convention, numeric constraint, and rendering dependency.

Key findings include:
1. **File Location**: The frontend is a Next.js 16 client application. `data.json` should reside at **both** `/Users/johnathanhare/materials-dashboard/public/data.json` (for client HTTP fetching via `/data.json` and static asset serving) and `/Users/johnathanhare/materials-dashboard/data.json` (for direct TypeScript/ES module imports via `@/data.json` and server/validation scripts).
2. **Key Casing & Naming**: Recharts strictly binds to camelCase keys: `name`, `density`, `strength`, `modulus`, `bulkModulus`, `price`, `family`, `color`. Crucially, Recharts uses `strength` (not `yieldStrength`) and `modulus` (not `youngsModulus`). To satisfy both the Recharts runtime and `ORIGINAL_REQUEST.md`, `data.json` MUST provide `strength` and `modulus`, and SHOULD include `yieldStrength` and `youngsModulus` as mirror aliases.
3. **Strict Positivity Constraint (> 0)**: The Ashby plot employs `scale="log"` on both axes, and filtering enforces `mat[axis] !== undefined && mat[axis] > 0`. Any non-positive number (<= 0), string, or null will be silently filtered out or cause SVG `NaN`/`-Infinity` rendering errors.
4. **Exact Family Casing**: The dashboard filters strictly against singular, title-cased family strings: `'Metal'`, `'Polymer'`, `'Composite'`, `'Ceramic'`, `'Natural'`. Plural forms (e.g. `'Metals'`) or lowercase forms will fail the filter and remain completely invisible.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Data Storage | Root Dataset Path | Dataset at project root (`./data.json`) for Node scripts, schema validators, and `@/data.json` bundler imports. | File on disk | JSON Array `Material[]` | Missing file throws `ENOENT` or build resolution failure | `tsconfig.json` (`resolveJsonModule: true`, `@/*: ["./*"]`) |
| 2 | Data Storage | Public Dataset Path | Dataset in public folder (`./public/data.json`) for client-side `fetch('/data.json')` and static delivery. | HTTP GET `/data.json` | JSON Array `Material[]` | 404 Not Found if missing in `public/` | Next.js 16 App Router public convention |
| 3 | Schema Property | `name` | Commercial and engineering material name | String (e.g. `"Steel (AISI 1020)"`) | Rendered in tooltip and search bar | If empty/missing, renders blank in tooltip; search filter crashes if null (`mat.name.toLowerCase()`) | `app/page.tsx:11,84,117` |
| 4 | Schema Property | `density` | Material density in g/cm³ | Number > 0 (e.g. `7.85`) | Rendered on X/Y axis and tooltip | Filtered out if `<= 0` or undefined; log domain crash if `<= 0` | `app/page.tsx:11,36,85,121` |
| 5 | Schema Property | `strength` | Yield strength in MPa (Required by Recharts) | Number > 0 (e.g. `350`) | Rendered on X/Y axis and tooltip | If key is `yieldStrength` instead of `strength`, property is missing: filtered out when Yield Strength axis selected | `app/page.tsx:11,37,85,124` |
| 6 | Schema Property | `modulus` | Young's modulus in GPa (Required by Recharts) | Number > 0 (e.g. `200`) | Rendered on X/Y axis and tooltip (default Y-axis) | If key is `youngsModulus` instead of `modulus`, missing: 100% of materials disappear on initial load | `app/page.tsx:11,38,58,86,123` |
| 7 | Schema Property | `bulkModulus` | Bulk modulus (K) in GPa | Number > 0 (e.g. `140`) | Rendered on X/Y axis and tooltip | Filtered out when Bulk Modulus axis is selected if `<= 0` or missing | `app/page.tsx:11,39,85,125` |
| 8 | Schema Property | `price` | Commercial price in $/kg | Number > 0 (e.g. `0.5`) | Rendered on X/Y axis | Filtered out when Price axis is selected if `<= 0` or missing | `app/page.tsx:11,40,85` |
| 9 | Schema Property | `family` | Categorical material class | String: strictly `'Metal'`, `'Polymer'`, `'Composite'`, `'Ceramic'`, or `'Natural'` | Controls filter buttons, dot color, and tooltip | If plural (`'Metals'`) or lowercase (`'metal'`), `activeFamilies.includes(mat.family)` fails; point is hidden | `app/page.tsx:11,43-50,87,305` |
| 10 | Schema Property | `color` | Hex color code | Hex string (e.g. `'#64748b'`) | Per-material accent / fallback color | Invalid hex results in fallback color or broken SVG styling | `app/page.tsx:11,313`, `ORIGINAL_REQUEST.md:13` |
| 11 | Visualization | ScatterChart & Cell Rendering | 2D Ashby log-log scatter plot with dynamic family colors | Filtered `Material[]` | SVG Scatter with logarithmic axes (900x600 px) | Non-numeric or non-positive points produce `NaN` coordinates | `app/page.tsx:271-317` |
| 12 | Visualization | Pan & Zoom | Interactive canvas zoom/pan via `react-zoom-pan-pinch` | User mouse wheel/pinch/buttons | Scaled SVG chart (0.5x to 10x) | Fixed dimensions prevent responsive layout oscillation | `app/page.tsx:254-270` |
| 13 | Interactive Filter | Family Toggle | Multi-select toggle buttons for material families | User click | Updates `activeFamilies` state | Toggling off hides all materials in that family | `app/page.tsx:91-95,185-199` |
| 14 | Interactive Filter | Text Search | Name search input | User string query | Filters `materials` by `mat.name.toLowerCase()` | Case-insensitive substring match | `app/page.tsx:84` |
| 15 | AI Copilot | `askMaterialCopilot` | Gemini-powered assistant recommending materials from dataset | Query string + current materials JSON | Markdown recommendation (max 2 sentences) | Returns mock prompt if `GEMINI_API_KEY` missing; handles API error gracefully | `app/actions.ts:66-101`, `app/page.tsx:97-110,203-240` |
| 16 | API Sync | `fetchRealMaterials` | External Materials Project API v2 fetcher | `MATERIALS_PROJECT_API_KEY` env var | Array of computed MP materials | Fails gracefully if API key is missing, leaving static materials active | `app/actions.ts:5-64`, `app/page.tsx:66-81` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Axis Property Resolution | Material object has `yieldStrength: 350` but lacks `strength: 350` | When user selects "Yield Strength" axis, `xAxisProperty.key` or `yAxisProperty.key` is `'strength'`. `mat['strength']` is `undefined`, failing `mat[key] > 0`. The material is **completely filtered out and invisible**. |
| 2 | Default Y-Axis Load | Material object has `youngsModulus: 200` but lacks `modulus: 200` | The dashboard defaults Y-axis to `modulus` (line 58). `mat['modulus']` is `undefined`. `hasY` is false. **100% of materials disappear on initial page load**. |
| 3 | Family Filter | Plural family name e.g. `"family": "Metals"` | `FAMILY_COLORS` defines singular keys (`'Metal'`, `'Polymer'`, etc.). `activeFamilies` contains singular names. `activeFamilies.includes("Metals")` returns `false`. **The material is permanently filtered out**. |
| 4 | Family Filter | Lowercase family name e.g. `"family": "metal"` | Case-sensitive equality check `activeFamilies.includes("metal")` fails. Material is permanently filtered out. |
| 5 | Log Scale Math | Zero numeric value e.g. `density: 0` or `price: 0` | 1) Evaluates `mat[key] > 0` as `false`, filtering out the material. 2) In Recharts, `scale="log"` calculates $\log_{10}(0) = -\infty$, corrupting SVG paths. |
| 6 | Log Scale Math | Negative numeric value e.g. `strength: -10` | Evaluates `mat[key] > 0` as `false`. If bypassed, $\log_{10}(-10)$ produces `NaN`, causing console errors and SVG rendering failure. |
| 7 | Type Safety | Numeric value passed as string e.g. `"density": "7.85"` | In JavaScript, `"7.85" > 0` is true, but Recharts domain math `(dataMin: number) => dataMin * 0.5` and tick generation can encounter type coercion anomalies or sorting bugs. TypeScript type-check and schema validation will fail. |
| 8 | Nullable Property | Missing or `null` numeric property | `mat[key] !== undefined && mat[key] > 0` evaluates to `false` for `null` or `undefined`. Material is excluded when that property is plotted. In tooltip, displays `'-'`. Acceptance criteria explicitly forbid nulls. |
| 9 | Nullable Name | `name: null` or `name: undefined` | `mat.name.toLowerCase()` in `filteredMaterials` throws `TypeError: Cannot read properties of null (reading 'toLowerCase')`, crashing the entire React component. |
| 10 | Dataset Size | Dataset array has < 50 or > 75 materials | Breaks Acceptance Criteria R1/R3 (`50-75 materials`). If > 50 materials are present, Copilot slices to first 50 (`currentMaterials.slice(0, 50)`). |
| 11 | Color Format | Non-hex string e.g. `"blue"` or invalid hex | While Recharts overrides cell fill with `familyColors[entry.family]`, invalid hex strings break any component reading `material.color` directly and fail schema validation. |

---

## 1. Observation

### 1.1 Codebase File Layout
Direct inspection of `/Users/johnathanhare/materials-dashboard` reveals the following structure:
- Project root:
  - `package.json` (Next.js 16.4.0, React 19.3.0, Recharts 3.10.1, TypeScript 5, Tailwind CSS 4)
  - `tsconfig.json` (strict TypeScript, path alias `@/*: ["./*"]`, `resolveJsonModule: true`)
  - `app/page.tsx` (Ashby ScatterChart dashboard client component)
  - `app/actions.ts` (Server actions: `fetchRealMaterials`, `askMaterialCopilot`)
  - `app/layout.tsx` (Root layout with Geist font)
  - `app/globals.css` (Tailwind CSS 4 setup)
  - `public/` (SVG icons: `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`)
  - `.env.local` (Contains `MATERIALS_PROJECT_API_KEY` and `GEMINI_API_KEY`)

### 1.2 Data Expectation and Mock Data in `app/page.tsx`
Lines 10–33 of `/Users/johnathanhare/materials-dashboard/app/page.tsx`:
```typescript
const initialMockMaterials = [
  { name: 'Steel (AISI 1020)', density: 7.85, strength: 350, modulus: 200, bulkModulus: 140, price: 0.5, family: 'Metal', color: '#64748b' },
  { name: 'Aluminum (6061-T6)', density: 2.7, strength: 276, modulus: 69, bulkModulus: 70, price: 2.0, family: 'Metal', color: '#94a3b8' },
  { name: 'Titanium (Ti-6Al-4V)', density: 4.43, strength: 880, modulus: 114, bulkModulus: 105, price: 15.0, family: 'Metal', color: '#475569' },
  
  { name: 'Carbon Fiber (CFRP)', density: 1.6, strength: 1000, modulus: 150, bulkModulus: 20, price: 25.0, family: 'Composite', color: '#0f172a' },
  { name: 'Kevlar (Aramid)', density: 1.44, strength: 3620, modulus: 112, bulkModulus: 10, price: 30.0, family: 'Composite', color: '#0f172a' },
  { name: 'Fiberglass (GFRP)', density: 1.9, strength: 200, modulus: 25, bulkModulus: 15, price: 3.5, family: 'Composite', color: '#0f172a' },
  
  { name: 'Polycarbonate (PC)', density: 1.2, strength: 65, modulus: 2.4, bulkModulus: 3.5, price: 3.0, family: 'Polymer', color: '#3b82f6' },
  { name: 'Nylon 6/6', density: 1.14, strength: 85, modulus: 2.8, bulkModulus: 4.0, price: 4.0, family: 'Polymer', color: '#3b82f6' },
  { name: 'PVC (Rigid)', density: 1.4, strength: 45, modulus: 3.0, bulkModulus: 3.0, price: 1.2, family: 'Polymer', color: '#3b82f6' },
  { name: 'Teflon (PTFE)', density: 2.2, strength: 25, modulus: 0.5, bulkModulus: 2.0, price: 12.0, family: 'Polymer', color: '#3b82f6' },
  { name: 'ABS', density: 1.05, strength: 40, modulus: 2.2, bulkModulus: 2.8, price: 2.0, family: 'Polymer', color: '#3b82f6' },
  { name: 'Epoxy', density: 1.25, strength: 60, modulus: 3.5, bulkModulus: 4.0, price: 5.0, family: 'Polymer', color: '#3b82f6' },
  
  { name: 'Concrete', density: 2.4, strength: 5, modulus: 30, bulkModulus: 20, price: 0.1, family: 'Ceramic', color: '#d6d3d1' },
  { name: 'Soda-Lime Glass', density: 2.5, strength: 33, modulus: 70, bulkModulus: 40, price: 0.5, family: 'Ceramic', color: '#d6d3d1' },
  { name: 'Alumina (Al2O3)', density: 3.9, strength: 300, modulus: 380, bulkModulus: 250, price: 10.0, family: 'Ceramic', color: '#d6d3d1' },
  
  { name: 'Oak Wood (Parallel)', density: 0.75, strength: 45, modulus: 11, bulkModulus: 1.5, price: 1.5, family: 'Natural', color: '#a16207' },
  { name: 'Pine Wood', density: 0.5, strength: 30, modulus: 8, bulkModulus: 1.0, price: 0.5, family: 'Natural', color: '#a16207' },
  { name: 'Bamboo', density: 0.6, strength: 55, modulus: 18, bulkModulus: 2.0, price: 1.0, family: 'Natural', color: '#a16207' },
];
```

### 1.3 Axis Properties and Keys in `app/page.tsx`
Lines 35–41 of `/Users/johnathanhare/materials-dashboard/app/page.tsx`:
```typescript
const axisOptions = [
  { key: 'density', label: 'Density', unit: 'g/cm³' },
  { key: 'strength', label: 'Yield Strength', unit: 'MPa' },
  { key: 'modulus', label: 'Young\'s Modulus', unit: 'GPa' },
  { key: 'bulkModulus', label: 'Bulk Modulus', unit: 'GPa' },
  { key: 'price', label: 'Price', unit: '$/kg' }
];
```
Default selections:
Line 57: `const [xAxisProperty, setXAxisProperty] = useState(axisOptions[0]);` (key: `'density'`)  
Line 58: `const [yAxisProperty, setYAxisProperty] = useState(axisOptions[2]);` (key: `'modulus'`)

### 1.4 Material Families and Color Palette in `app/page.tsx`
Lines 43–50 of `/Users/johnathanhare/materials-dashboard/app/page.tsx`:
```typescript
const FAMILY_COLORS: Record<string, string> = {
  'Metal': '#ef4444',       // Red
  'Polymer': '#3b82f6',     // Blue
  'Composite': '#10b981',   // Green
  'Ceramic': '#f59e0b',     // Orange
  'Natural': '#8b5cf6',     // Purple
  'Computed (MP)': '#06b6d4'// Cyan
};
```
Line 55: `const [activeFamilies, setActiveFamilies] = useState<string[]>(Object.keys(FAMILY_COLORS));`

### 1.5 Filtering Logic in `app/page.tsx`
Lines 83–89 of `/Users/johnathanhare/materials-dashboard/app/page.tsx`:
```typescript
  const filteredMaterials = materials.filter(mat => {
    const matchesSearch = mat.name.toLowerCase().includes(searchTerm.toLowerCase());
    const hasX = mat[xAxisProperty.key] !== undefined && mat[xAxisProperty.key] > 0;
    const hasY = mat[yAxisProperty.key] !== undefined && mat[yAxisProperty.key] > 0;
    const matchesFamily = activeFamilies.includes(mat.family);
    return matchesSearch && hasX && hasY && matchesFamily;
  });
```

### 1.6 Tooltip Template in `app/page.tsx`
Lines 112–131 of `/Users/johnathanhare/materials-dashboard/app/page.tsx`:
```typescript
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border rounded shadow-lg text-sm z-50">
          <p className="font-bold text-gray-800">{data.name}</p>
          <p className="text-gray-600 text-xs mb-2">{data.family}</p>
          <div className="text-gray-700 grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-gray-500">Density:</span> 
            <span className="font-medium">{data.density || '-'} g/cm³</span>
            <span className="text-gray-500">Modulus:</span> 
            <span className="font-medium">{data.modulus || '-'} GPa</span>
            {data.strength && <><span className="text-gray-500">Yield Str:</span><span className="font-medium">{data.strength} MPa</span></>}
            {data.bulkModulus && <><span className="text-gray-500">Bulk Mod:</span><span className="font-medium">{data.bulkModulus} GPa</span></>}
          </div>
        </div>
      );
    }
    return null;
  };
```

### 1.7 Recharts Scatter and Cell Binding
Lines 273–317 of `/Users/johnathanhare/materials-dashboard/app/page.tsx`:
```typescript
<XAxis 
  type="number" 
  dataKey={xAxisProperty.key} 
  name={xAxisProperty.label} 
  unit={` ${xAxisProperty.unit}`} 
  label={{ value: `${xAxisProperty.label} (${xAxisProperty.unit})`, position: 'bottom', offset: 10 }}
  tick={{ fontSize: 12, fill: '#6b7280' }}
  scale="log" 
  domain={[(dataMin: number) => Math.max(0.001, dataMin * 0.5), (dataMax: number) => dataMax * 1.5]}
  allowDataOverflow={true}
/>
<YAxis 
  type="number" 
  dataKey={yAxisProperty.key} 
  name={yAxisProperty.label} 
  unit={` ${yAxisProperty.unit}`} 
  label={{ value: `${yAxisProperty.label} (${yAxisProperty.unit})`, angle: -90, position: 'insideLeft', offset: -10 }}
  tick={{ fontSize: 12, fill: '#6b7280' }}
  scale="log"
  domain={[(dataMin: number) => Math.max(0.001, dataMin * 0.5), (dataMax: number) => dataMax * 1.5]}
  allowDataOverflow={true}
/>
<ZAxis type="number" range={[100, 300]} />
<Tooltip 
  content={<CustomTooltip />} 
  cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8' }} 
  isAnimationActive={false} 
/>

<Scatter data={filteredMaterials} animationDuration={600}>
  {filteredMaterials.map((entry, index) => {
    const familyColors: Record<string, string> = {
      'Metal': '#ef4444',       // Red
      'Polymer': '#3b82f6',     // Blue
      'Composite': '#10b981',   // Green
      'Ceramic': '#f59e0b',     // Orange
      'Natural': '#8b5cf6',     // Purple
      'Computed (MP)': '#06b6d4'// Cyan
    };
    const color = familyColors[entry.family] || '#64748b';
    return <Cell key={`cell-${index}`} fill={color} fillOpacity={0.7} stroke={color} strokeWidth={1} />;
  })}
</Scatter>
```

### 1.8 Build, Lint, and Compiler Commands
Direct execution commands and outputs:
- `npm run build`: Exited code 0. Compiled successfully with Turbopack, static page generation passed.
- `npx tsc --noEmit`: Exited code 0. No TypeScript compilation errors.
- `npm run lint`: Exited code 1 with 9 errors and 6 warnings:
  - `Unexpected any. Specify a different type @typescript-eslint/no-explicit-any` in `app/page.tsx` (lines 53, 112, 222) and `app/actions.ts` (lines 37, 61, 66).
  - `A require() style import is forbidden @typescript-eslint/no-require-imports` in `fix_zoom.js` (line 1) and `test_gemini.js` (lines 1, 2).
- Node version: `v24.18.1`, npm version: `11.16.0`.
- No test script is currently defined in `package.json` (`"scripts": { "dev": "next dev", "build": "next build", "start": "next start", "lint": "eslint" }`).

---

## 2. Logic Chain

1. **Mapping Requirements from `ORIGINAL_REQUEST.md` to Implementation**:
   - `ORIGINAL_REQUEST.md` specifies 8 target properties: Name, Density (g/cm³), Yield Strength (MPa), Young's Modulus (GPa), Bulk Modulus (GPa), Price ($/kg), Family, and Color (hex code).
   - In `app/page.tsx`, `axisOptions` defines the exact keys Recharts uses to extract values:
     - `'density'` $\to$ Density (g/cm³)
     - `'strength'` $\to$ Yield Strength (MPa)
     - `'modulus'` $\to$ Young's Modulus (GPa)
     - `'bulkModulus'` $\to$ Bulk Modulus (GPa)
     - `'price'` $\to$ Price ($/kg)
   - If `data.json` used `yieldStrength` instead of `strength` or `youngsModulus` instead of `modulus`, selecting Yield Strength or Young's Modulus on the dashboard would evaluate `mat[axisProperty.key]` as `undefined`. Consequently, line 85/86 (`mat[key] !== undefined && mat[key] > 0`) would evaluate to `false`, and every material would be omitted from the plot.
   - Therefore, `strength` and `modulus` are **strict runtime requirements** for Recharts. To satisfy both the runtime code and human reviewers checking `ORIGINAL_REQUEST.md`, providing both `strength` and `yieldStrength`, as well as `modulus` and `youngsModulus`, is optimal and backwards-compatible.

2. **Deduction of the Strict Positivity Requirement ($> 0$)**:
   - Lines 280 and 291 of `app/page.tsx` configure both axes with `scale="log"`.
   - Logarithmic transformation is undefined for non-positive numbers ($\le 0$).
   - Lines 85–86 explicitly enforce `mat[xAxisProperty.key] > 0` and `mat[yAxisProperty.key] > 0`.
   - Any material with a missing, null, zero, or negative value for any property will be excluded whenever that property is plotted.
   - Therefore, all numeric fields (`density`, `strength`, `modulus`, `bulkModulus`, `price`) must be strictly positive floats or integers ($> 0$).

3. **Deduction of Exact Family String Casing**:
   - `FAMILY_COLORS` defines keys: `'Metal'`, `'Polymer'`, `'Composite'`, `'Ceramic'`, `'Natural'`, `'Computed (MP)'`.
   - In line 55, `activeFamilies` is initialized with `Object.keys(FAMILY_COLORS)`.
   - In line 87, `filteredMaterials` requires `activeFamilies.includes(mat.family)`.
   - JavaScript string equality is case-sensitive and literal. If a material has `"family": "Metals"` (plural) or `"family": "metal"` (lowercase), `activeFamilies.includes(mat.family)` evaluates to `false`.
   - Therefore, `family` must strictly be one of: `"Metal"`, `"Polymer"`, `"Composite"`, `"Ceramic"`, `"Natural"`.

4. **Resolution of `data.json` File Path**:
   - In Next.js 16 App Router, client-side fetches such as `fetch('/data.json')` can only serve files located in `/Users/johnathanhare/materials-dashboard/public/data.json`.
   - In `tsconfig.json`, `resolveJsonModule: true` and path alias `@/*: ["./*"]` allow ES module imports from the root, e.g. `import materials from '@/data.json'`.
   - Standalone Node.js scripts (schema validators, test suites) typically inspect `./data.json` in the project root.
   - Placing `data.json` in BOTH `/Users/johnathanhare/materials-dashboard/public/data.json` AND `/Users/johnathanhare/materials-dashboard/data.json` (or keeping them identical) completely eliminates path ambiguities and ensures compatibility with every consumer.

---

## 3. Caveats

1. **Materials Project API Syncing**:
   - `app/page.tsx` contains an active `useEffect` calling `fetchRealMaterials()` which attempts to fetch 100 materials from Materials Project API v2.
   - While `MATERIALS_PROJECT_API_KEY` is present in `.env.local`, the server action fails gracefully (`try/catch` in `loadData`) if offline or rate-limited.
   - When integrating static `data.json`, the explorer/developer team may either replace `initialMockMaterials` with the contents of `data.json` or load `data.json` in `loadData()`.
2. **ESLint Errors in Existing Project Files**:
   - `npm run lint` currently fails due to pre-existing `any` types in `app/page.tsx` and `app/actions.ts`, and `require()` calls in `fix_zoom.js` and `test_gemini.js`.
   - These lint errors exist independently of `data.json`, but can be resolved by declaring a clean `Material` interface.
3. **No Pre-existing Automated Test Runner**:
   - There is no Jest or Vitest package installed in `package.json`.
   - Programmatic schema validation must be executed via a standalone Node.js script (e.g. `node scripts/validate_data.mjs` or `node -e "..."`).

---

## 4. Conclusion

### 4.1 Authoritative TypeScript Interface

```typescript
/**
 * Authoritative Material Interface for materials-dashboard
 */
export type MaterialFamily = 
  | 'Metal'
  | 'Polymer'
  | 'Composite'
  | 'Ceramic'
  | 'Natural';

export interface Material {
  /** Commercial or engineering material designation (e.g. "Steel (AISI 1020)") */
  name: string;

  /** Mass density in g/cm³ (strictly > 0) */
  density: number;

  /** Yield strength in MPa (strictly > 0; required by Recharts axis & tooltip) */
  strength: number;

  /** Young's modulus in GPa (strictly > 0; required by Recharts axis & tooltip) */
  modulus: number;

  /** Bulk modulus in GPa (strictly > 0; required by Recharts axis & tooltip) */
  bulkModulus: number;

  /** Estimated raw material price in $/kg USD (strictly > 0; required by Recharts axis) */
  price: number;

  /** Primary material family (strictly title-cased singular) */
  family: MaterialFamily;

  /** Hex color code for display (e.g. "#64748b" or family color) */
  color: string;

  // --- Recommended Mirror Aliases for Specification Compliance ---
  /** Mirror alias for strength (MPa) */
  yieldStrength?: number;

  /** Mirror alias for modulus (GPa) */
  youngsModulus?: number;
}
```

### 4.2 Exact Canonical JSON Schema for `data.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MaterialsDatabase",
  "type": "array",
  "minItems": 50,
  "maxItems": 75,
  "items": {
    "type": "object",
    "required": [
      "name",
      "density",
      "strength",
      "modulus",
      "bulkModulus",
      "price",
      "family",
      "color"
    ],
    "properties": {
      "name": {
        "type": "string",
        "minLength": 1
      },
      "density": {
        "type": "number",
        "exclusiveMinimum": 0
      },
      "strength": {
        "type": "number",
        "exclusiveMinimum": 0
      },
      "yieldStrength": {
        "type": "number",
        "exclusiveMinimum": 0
      },
      "modulus": {
        "type": "number",
        "exclusiveMinimum": 0
      },
      "youngsModulus": {
        "type": "number",
        "exclusiveMinimum": 0
      },
      "bulkModulus": {
        "type": "number",
        "exclusiveMinimum": 0
      },
      "price": {
        "type": "number",
        "exclusiveMinimum": 0
      },
      "family": {
        "type": "string",
        "enum": ["Metal", "Polymer", "Composite", "Ceramic", "Natural"]
      },
      "color": {
        "type": "string",
        "pattern": "^#[0-9a-fA-F]{6}$"
      }
    },
    "additionalProperties": true
  }
}
```

### 4.3 Recommended Canonical Material Object Example

```json
{
  "name": "Steel (AISI 1020)",
  "density": 7.85,
  "strength": 350,
  "yieldStrength": 350,
  "modulus": 200,
  "youngsModulus": 200,
  "bulkModulus": 140,
  "price": 0.5,
  "family": "Metal",
  "color": "#ef4444"
}
```

---

## 5. Verification Method

To independently verify the schema against `data.json` once generated, execute the following commands in `/Users/johnathanhare/materials-dashboard`:

### Command 1: Programmatic Validation Script
Run the following Node.js one-liner to validate count, types, positivity, and family strings:

```bash
node -e '
const fs = require("fs");
const targetPath = fs.existsSync("./public/data.json") ? "./public/data.json" : "./data.json";
console.log("Validating:", targetPath);
const data = JSON.parse(fs.readFileSync(targetPath, "utf8"));

if (!Array.isArray(data)) throw new Error("Dataset is not an array");
if (data.length < 50 || data.length > 75) {
  throw new Error(`Item count out of range: ${data.length} (expected 50-75)`);
}

const validFamilies = new Set(["Metal", "Polymer", "Composite", "Ceramic", "Natural"]);
const hexRegex = /^#[0-9a-fA-F]{6}$/;
const names = new Set();

data.forEach((m, i) => {
  if (!m.name || typeof m.name !== "string") throw new Error(`[${i}] Invalid name`);
  if (names.has(m.name)) throw new Error(`[${i}] Duplicate name: ${m.name}`);
  names.add(m.name);

  const numericFields = ["density", "strength", "modulus", "bulkModulus", "price"];
  numericFields.forEach(f => {
    if (typeof m[f] !== "number" || isNaN(m[f]) || m[f] <= 0) {
      throw new Error(`[${i}] ${m.name}: Field ${f} must be a number > 0. Found: ${m[f]}`);
    }
  });

  if (!validFamilies.has(m.family)) {
    throw new Error(`[${i}] ${m.name}: Invalid family "${m.family}". Must be one of: ${Array.from(validFamilies).join(", ")}`);
  }

  if (!m.color || !hexRegex.test(m.color)) {
    throw new Error(`[${i}] ${m.name}: Invalid hex color: ${m.color}`);
  }
});

console.log(`SUCCESS: All ${data.length} materials strictly conform to the Recharts schema!`);
'
```

### Command 2: TypeScript Compilation Check
Verify that the project compiles cleanly:
```bash
npx tsc --noEmit
```

### Command 3: Next.js Production Build
Verify that the production bundle builds without errors:
```bash
npm run build
```
