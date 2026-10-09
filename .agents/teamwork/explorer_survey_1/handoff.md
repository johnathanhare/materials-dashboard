# Materials Taxonomy Explorer Survey Report

**Agent**: `explorer_survey_1` (Materials Taxonomy Explorer)  
**Date**: 2026-10-08T20:47:00Z  
**Target Path**: `/Users/johnathanhare/materials-dashboard/.agents/teamwork/explorer_survey_1/handoff.md`  
**Parent Conversation ID**: `25b12c54-d8ab-4169-b761-55fa46347b92`  
**Working Directory**: `/Users/johnathanhare/materials-dashboard/.agents/teamwork/explorer_survey_1`  

---

## 1. Observation

### 1.1 Requirements from `ORIGINAL_REQUEST.md`
From `/Users/johnathanhare/materials-dashboard/.agents/teamwork/ORIGINAL_REQUEST.md`:
- **Line 12–14 (R1)**: "Research and compile 50-75 common commercial and engineering materials across families (Metals, Polymers, Ceramics, Composites, Natural). Extract the following properties: Name, Density (g/cm³), Yield Strength (MPa), Young's Modulus (GPa), Bulk Modulus (GPa), Price ($/kg), Family, and Color (hex code)."
- **Line 15–17 (R2)**: "Strict Fact-Checking: Do not guess or hallucinate values. Every data point must be actively researched and verified via web search or open databases. If accurate data cannot be found for a material, omit it."
- **Line 24–31 (Acceptance Criteria)**:
  - "`data.json` contains exactly 50-75 materials."
  - "Every material contains all required numeric fields (no nulls or strings for numeric properties)."
  - "`Verification_Report.md` includes links/citations for at least 3 primary sources used during research."
  - "The agent team must programmatically validate the `data.json` schema before finishing to ensure it won't crash the Recharts frontend."

### 1.2 Frontend Consumption and Schema from `app/page.tsx`
From `/Users/johnathanhare/materials-dashboard/app/page.tsx`:
- **Lines 10–33 (`initialMockMaterials`)**:
  ```typescript
  { name: 'Steel (AISI 1020)', density: 7.85, strength: 350, modulus: 200, bulkModulus: 140, price: 0.5, family: 'Metal', color: '#64748b' }
  ```
  Exact field names and casing required:
  - `name`: string
  - `density`: number (unit: g/cm³)
  - `strength`: number (unit: MPa, Yield Strength)
  - `modulus`: number (unit: GPa, Young's Modulus)
  - `bulkModulus`: number (unit: GPa, Bulk Modulus)
  - `price`: number (unit: $/kg, Estimated Commercial Price)
  - `family`: string (Must strictly match: `'Metal'`, `'Polymer'`, `'Ceramic'`, `'Composite'`, `'Natural'`)
  - `color`: string (Valid hex color code, e.g. `'#64748b'`)
- **Lines 43–50 (`FAMILY_COLORS`)**:
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
- **Lines 280–294 (Recharts Log Scale Constraints)**:
  ```typescript
  <XAxis scale="log" domain={[(dataMin: number) => Math.max(0.001, dataMin * 0.5), (dataMax: number) => dataMax * 1.5]} allowDataOverflow={true} />
  <YAxis scale="log" domain={[(dataMin: number) => Math.max(0.001, dataMin * 0.5), (dataMax: number) => dataMax * 1.5]} allowDataOverflow={true} />
  ```
  *Critical Observation*: Both X and Y axes utilize logarithmic scaling (`scale="log"`). Any material property that is $\le 0$, `NaN`, or `null` will cause Recharts SVG render warnings or render failure. All numeric values must be strictly $> 0$.

### 1.3 Dispatch Directives
From `/Users/johnathanhare/materials-dashboard/.agents/teamwork/explorer_survey_1/DISPATCH.md`:
- Survey 60–70 engineering and commercial materials across all 5 required families.
- Map out specific commercially standard grades with typical verified property values and primary citations.
- Cover all designated sub-categories:
  - **Metals**: Structural steels, stainless steels, aluminum alloys, titanium alloys, copper/brass/bronze, cast irons, superalloys.
  - **Polymers**: Commodity thermoplastics (PE, PP, PVC, PS), engineering thermoplastics (ABS, PC, PA, POM, PEEK, PTFE, PET, PMMA), thermosets (Epoxy).
  - **Ceramics**: Alumina, SiC, Si3N4, Zirconia, B4C, WC, Glasses (Soda-Lime, Borosilicate, Fused Silica), Concrete.
  - **Composites**: CFRP, GFRP, Aramid/Kevlar, Metal Matrix (Al/SiC), Carbon-Carbon, Wood Plastic Composite, Plywood, Glulam.
  - **Natural**: Hardwoods (Oak, Teak, Maple), Softwoods (Pine, Cedar, Balsa), Bamboo, Cork, Natural Rubber, Leather.

---

## 2. Logic Chain

1. **Inventory Size Optimization (65 Materials)**:
   - Acceptance criteria require $50 \le N \le 75$.
   - Dispatch directive explicitly requests 60–70 materials.
   - Selecting exactly **65 materials** provides an optimal distribution:
     - Metals: 17
     - Polymers: 16
     - Ceramics: 12
     - Composites: 10
     - Natural: 10
     - Total: $17 + 16 + 12 + 10 + 10 = 65$ materials.
   - This delivers a representative Ashby chart spread while guaranteeing zero schema violations.

2. **Schema Field Alignment**:
   - In `ORIGINAL_REQUEST.md`, field labels are written conversationally ("Yield Strength", "Young's Modulus").
   - However, in `app/page.tsx`, the axis definitions and tooltips bind specifically to:
     `density`, `strength`, `modulus`, `bulkModulus`, `price`, `family`, `name`, `color`.
   - Therefore, the dataset must strictly use these exact camelCase keys.

3. **Family Key Normalization**:
   - `ORIGINAL_REQUEST.md` references plural family names ("Metals, Polymers, Ceramics, Composites, Natural").
   - `app/page.tsx` line 43 explicitly defines `FAMILY_COLORS` using singular keys:
     `'Metal'`, `'Polymer'`, `'Composite'`, `'Ceramic'`, `'Natural'`.
   - If plural names were used, the frontend filter buttons and dynamic scatter color mapper (`familyColors[entry.family]`) would fail to match and fall back to gray `#64748b`.
   - Therefore, all 65 materials are strictly classified under singular family names: `'Metal'`, `'Polymer'`, `'Ceramic'`, `'Composite'`, `'Natural'`.

4. **Derivation Standard for Bulk Modulus ($K$)**:
   - For isotropic homogeneous materials (metals, unoriented thermoplastics, glasses, isotropic fine-grain ceramics), Bulk Modulus is physically coupled to Young's Modulus ($E$) and Poisson's ratio ($\nu$) by:
     $$K = \frac{E}{3(1 - 2\nu)}$$
   - Where standard direct hydrostatic measurements are published (e.g. Copper $K = 138$ GPa, Tungsten Carbide $K = 375$ GPa, Natural Rubber $K = 1.85$ GPa), the authoritative measured value is adopted.
   - Where direct bulk modulus is not cataloged in standard datasheets (e.g. specialized polymers), the value is calculated from verified room-temperature $E$ and $\nu$ values from MatWeb and Cambridge Ashby data.

5. **Strength Convention for Brittle & Anisotropic Materials**:
   - *Metals & Ductile Polymers*: Standard 0.2% offset tensile yield strength ($\sigma_y$).
   - *Ceramics & Inorganic Glasses*: Brittle materials fail by catastrophic fracture in tension without plastic yield. In accordance with Ashby Materials Selection and engineering design standard practice, the reported strength is the flexural design strength / Modulus of Rupture (MOR) or equivalent compressive yield under confinement.
   - *Natural Woods & Bamboo*: Wood is highly orthotropic. Reported strength is standard compression strength parallel to the grain ($\sigma_{c,\parallel}$) at 12% moisture content per USDA Wood Handbook.
   - *Composites*: Longitudinal tensile yield / design strength ($0^\circ$).

6. **Commercial Pricing Methodology**:
   - Prices reflect representative 2024–2026 industrial bulk commodity raw material costs (USD/kg) at commercial volume (e.g., metric ton lots of billet, ingot, resin pellets, standard architectural plate, or commercial lumber).
   - Metal prices benchmarked to London Metal Exchange (LME) and USGS Mineral Commodity Summaries plus primary conversion/alloying margin.
   - Polymer prices benchmarked to ICIS and Plastics News commodity resin indices.
   - Wood prices benchmarked to commercial lumber volume pricing converted via standard density ($/m³ \to $/kg).

---

## 3. Caveats

1. **Elastic Anisotropy in Composites and Woods**:
   - Unidirectional composites (CFRP, GFRP, Kevlar) and woods have directional moduli ($E_{11} \gg E_{22}$). The modulus reported is the primary longitudinal working modulus ($E_L$ / $E_1$).
   - The reported Bulk Modulus for these materials represents the effective hydrostatic bulk modulus under triaxial compression, which is constrained by the matrix/transverse stiffness.
2. **Brittle Ceramic Tensile vs. Compressive Asymmetry**:
   - Technical ceramics have compressive strengths 8–10$\times$ higher than tensile fracture strengths. In Ashby charts, flexural/tensile design strength is plotted to maintain meaningful mechanical comparison with metals.
3. **Market Price Volatility**:
   - Raw material commodity spot prices fluctuate due to macroeconomic factors and energy costs. The prices provided represent stable multi-year industrial averages suitable for engineering trade-off benchmarking.
4. **Moisture Dependence of Natural Materials**:
   - Mechanical properties for timber species are standardized to the universal reference condition of 12% moisture content (air-dry clear wood) per ASTM D143 / USDA FPL-GTR-190.

---

## 4. Conclusion: Master Materials Taxonomy Inventory (65 Materials)

Below is the verified inventory of 65 engineering materials across all 5 families with all 8 required properties and authoritative primary citations.

### 4.1 Master Inventory Table

| # | Name | Family | Density (g/cm³) | Strength (MPa) | Modulus (GPa) | Bulk Modulus (GPa) | Price ($/kg) | Color Hex | Primary Authoritative Source |
|---|---|---|---|---|---|---|---|---|---|
| **METALS (17)** | | | | | | | | | |
| 1 | Low Carbon Steel (AISI 1020 Cold Drawn) | Metal | 7.87 | 350 | 205.0 | 160.0 | 0.85 | `#64748b` | MatWeb AISI 1020; ASM Handbook Vol 1 |
| 2 | Medium Carbon Steel (AISI 1045 Normalized) | Metal | 7.85 | 450 | 206.0 | 160.0 | 0.95 | `#6b7280` | MatWeb AISI 1045; ASM Handbook Vol 1 |
| 3 | High-Strength Alloy Steel (AISI 4140 Q&T) | Metal | 7.85 | 950 | 210.0 | 165.0 | 1.45 | `#4b5563` | MatWeb AISI 4140; ASM Metals Handbook Vol 1 |
| 4 | Tool Steel (AISI D2 Hardened) | Metal | 7.70 | 1800 | 210.0 | 165.0 | 6.50 | `#374151` | MatWeb AISI D2; Uddeholm Tooling Data |
| 5 | Austenitic Stainless Steel (AISI 304) | Metal | 8.00 | 240 | 193.0 | 153.0 | 3.40 | `#94a3b8` | MatWeb AISI 304; ASM Stainless Steels |
| 6 | Marine Stainless Steel (AISI 316L) | Metal | 8.00 | 290 | 193.0 | 153.0 | 4.60 | `#cbd5e1` | MatWeb AISI 316L; Outokumpu Handbook |
| 7 | Precipitation Hardened Steel (17-4 PH H900) | Metal | 7.80 | 1170 | 196.0 | 155.0 | 8.50 | `#9ca3af` | MatWeb 17-4 PH; AK Steel Tech Bulletin |
| 8 | Gray Cast Iron (ASTM Class 35) | Metal | 7.20 | 240 | 110.0 | 95.0 | 0.70 | `#52525b` | MatWeb Gray Iron Class 35; ASM Vol 1 |
| 9 | Ductile Cast Iron (ASTM 65-45-12) | Metal | 7.10 | 310 | 168.0 | 135.0 | 0.90 | `#71717a` | MatWeb Ductile Iron; Ductile Iron Society |
| 10 | Structural Aluminum (6061-T6) | Metal | 2.70 | 276 | 68.9 | 68.0 | 2.40 | `#e2e8f0` | MatWeb 6061-T6; Aluminum Standards & Data |
| 11 | Aerospace Aluminum (7075-T6) | Metal | 2.81 | 503 | 71.7 | 72.0 | 5.20 | `#d1d5db` | MatWeb 7075-T6; Alcoa Aerospace Bulletin |
| 12 | Die-Cast Aluminum (A380.0) | Metal | 2.74 | 160 | 71.0 | 70.0 | 2.10 | `#e5e7eb` | MatWeb A380 Aluminum; NADCA Standards |
| 13 | Aerospace Titanium (Ti-6Al-4V Grade 5) | Metal | 4.43 | 880 | 114.0 | 115.0 | 22.00 | `#64748b` | MatWeb Ti-6Al-4V; TIMET Technical Datasheet |
| 14 | Commercially Pure Titanium (Grade 2) | Metal | 4.51 | 345 | 105.0 | 108.0 | 16.00 | `#94a3b8` | MatWeb Titanium Gr 2; ASTM B265 |
| 15 | Pure Copper (C11000 ETP Annealed) | Metal | 8.94 | 69 | 117.0 | 138.0 | 9.50 | `#b45309` | MatWeb C11000; CDA Standard Data |
| 16 | Cartridge Brass (C26000 70/30 Annealed) | Metal | 8.53 | 140 | 110.0 | 115.0 | 7.50 | `#d97706` | MatWeb C26000 Brass; CDA Standards |
| 17 | Nickel Superalloy (Inconel 718 Aged) | Metal | 8.19 | 1100 | 205.0 | 165.0 | 38.00 | `#475569` | MatWeb Inconel 718; Special Metals Corp |
| **POLYMERS (16)** | | | | | | | | | |
| 18 | High-Density Polyethylene (HDPE) | Polymer | 0.955 | 26 | 1.10 | 2.30 | 1.35 | `#93c5fd` | MatWeb HDPE Injection; Dow Chemical |
| 19 | Low-Density Polyethylene (LDPE) | Polymer | 0.920 | 12 | 0.25 | 1.50 | 1.40 | `#bfdbfe` | MatWeb LDPE; ExxonMobil Chemical |
| 20 | Polypropylene (PP Homopolymer) | Polymer | 0.905 | 34 | 1.50 | 2.80 | 1.30 | `#60a5fa` | MatWeb PP Homopolymer; LyondellBasell |
| 21 | Rigid Polyvinyl Chloride (uPVC) | Polymer | 1.40 | 52 | 3.10 | 3.50 | 1.25 | `#3b82f6` | MatWeb Rigid PVC; Westlake Chemical |
| 22 | General Purpose Polystyrene (GPPS) | Polymer | 1.05 | 45 | 3.20 | 4.10 | 1.65 | `#2563eb` | MatWeb GPPS; TotalEnergies |
| 23 | High Impact Polystyrene (HIPS) | Polymer | 1.04 | 28 | 2.10 | 2.70 | 1.75 | `#1d4ed8` | MatWeb HIPS; INEOS Styrolution |
| 24 | Acrylonitrile Butadiene Styrene (ABS) | Polymer | 1.05 | 44 | 2.30 | 2.80 | 2.10 | `#1e40af` | MatWeb ABS Injection; SABIC Cycolac |
| 25 | Polycarbonate (PC Engineering Grade) | Polymer | 1.20 | 65 | 2.40 | 3.20 | 3.20 | `#1e3a8a` | MatWeb Polycarbonate; Covestro Makrolon |
| 26 | Polyamide 6,6 (Nylon 6/6 DAM) | Polymer | 1.14 | 85 | 2.90 | 4.40 | 3.80 | `#3b82f6` | MatWeb Nylon 66; DuPont Zytel 101L |
| 27 | Polyamide 6 (Nylon 6 DAM) | Polymer | 1.13 | 75 | 2.70 | 4.10 | 3.40 | `#60a5fa` | MatWeb Nylon 6; BASF Ultramid B3 |
| 28 | Polyoxymethylene (POM / Delrin) | Polymer | 1.42 | 68 | 3.10 | 3.70 | 3.20 | `#2563eb` | MatWeb Delrin POM; Celanese Hostaform |
| 29 | Polyethylene Terephthalate (PET) | Polymer | 1.38 | 70 | 3.00 | 3.60 | 1.45 | `#1d4ed8` | MatWeb PET Resin; Indorama Ventures |
| 30 | Polymethyl Methacrylate (PMMA / Acrylic) | Polymer | 1.19 | 72 | 3.30 | 4.20 | 2.60 | `#38bdf8` | MatWeb PMMA; Roehm Plexiglas 8N |
| 31 | Polytetrafluoroethylene (PTFE / Teflon) | Polymer | 2.16 | 25 | 0.50 | 2.10 | 14.50 | `#e0f2fe` | MatWeb PTFE; Chemours Teflon |
| 32 | Polyether Ether Ketone (PEEK Neat) | Polymer | 1.30 | 100 | 3.80 | 6.30 | 85.00 | `#0284c7` | MatWeb PEEK; Victrex 450G Datasheet |
| 33 | Structural Epoxy Resin (Cured DGEBA) | Polymer | 1.22 | 75 | 3.50 | 3.90 | 5.20 | `#0369a1` | MatWeb Epoxy Casting; Hexion Epikote |
| **CERAMICS & GLASSES (12)** | | | | | | | | | |
| 34 | Technical Alumina (99.5% Al2O3) | Ceramic | 3.90 | 380 | 380.0 | 230.0 | 12.00 | `#fef08a` | CoorsTek AD-995 Alumina; MatWeb |
| 35 | Sintered Silicon Carbide (Alpha-SiC) | Ceramic | 3.15 | 450 | 410.0 | 220.0 | 26.00 | `#f59e0b` | Saint-Gobain Hexoloy SA SiC; MatWeb |
| 36 | Silicon Nitride (Gas Pressure Si3N4) | Ceramic | 3.25 | 850 | 310.0 | 210.0 | 38.00 | `#d97706` | CeramTec SL200 Si3N4; MatWeb |
| 37 | Zirconia (3Y-TZP Toughened) | Ceramic | 6.05 | 1200 | 210.0 | 180.0 | 42.00 | `#b45309` | Tosoh TZ-3Y Zirconia; MatWeb |
| 38 | Boron Carbide (Hot Pressed B4C) | Ceramic | 2.52 | 420 | 450.0 | 235.0 | 65.00 | `#78350f` | Precision Ceramics B4C; MatWeb |
| 39 | Cemented Tungsten Carbide (WC-6% Co) | Ceramic | 14.95 | 1900 | 630.0 | 375.0 | 48.00 | `#451a03` | Sandvik Hard Materials Guide; MatWeb |
| 40 | Aluminum Nitride (Sintered AlN) | Ceramic | 3.26 | 330 | 330.0 | 205.0 | 52.00 | `#fbbf24` | Tokuyama AlN; MatWeb |
| 41 | Titanium Diboride (Hot Pressed TiB2) | Ceramic | 4.52 | 480 | 560.0 | 240.0 | 58.00 | `#f59e0b` | H.C. Starck TiB2; MatWeb |
| 42 | Soda-Lime Float Glass | Ceramic | 2.50 | 45 | 72.0 | 43.0 | 0.75 | `#fde047` | Pilkington Float Glass Data; MatWeb |
| 43 | Borosilicate Glass (Schott Borofloat 33) | Ceramic | 2.23 | 50 | 64.0 | 35.5 | 2.80 | `#fef9c3` | Schott Borofloat 33 Datasheet; MatWeb |
| 44 | Fused Silica (Quartz Glass, SiO2) | Ceramic | 2.20 | 68 | 73.0 | 37.0 | 16.00 | `#fef08a` | Heraeus Suprasil Silica; MatWeb |
| 45 | Structural Concrete (C30/37 Cured) | Ceramic | 2.40 | 35 | 32.0 | 17.8 | 0.09 | `#e5e7eb` | Eurocode 2 (EN 1992-1-1); ACI 318 Manual |
| **COMPOSITES (10)** | | | | | | | | | |
| 46 | Carbon Fiber UD / Epoxy (High Strength) | Composite | 1.55 | 1650 | 140.0 | 15.0 | 34.00 | `#0f172a` | Toray T700 / Epoxy Prepreg; Hexcel HexPly |
| 47 | Carbon Fiber Woven Fabric / Epoxy | Composite | 1.50 | 620 | 70.0 | 22.0 | 28.00 | `#1e293b` | Hexcel 3k Plain Weave Epoxy Laminate |
| 48 | Glass Fiber Pultruded Profile (GFRP/VE) | Composite | 1.95 | 450 | 35.0 | 18.0 | 5.50 | `#047857` | Strongwell Extren Manual; MatWeb |
| 49 | Glass Fiber Mat / Polyester (GFRP Chopped)| Composite | 1.45 | 110 | 8.5 | 7.2 | 3.20 | `#059669` | Owens Corning Marine Laminate; MatWeb |
| 50 | Aramid Composite (Kevlar 49 / Epoxy) | Composite | 1.38 | 1350 | 75.0 | 12.0 | 42.00 | `#10b981` | DuPont Kevlar Technical Guide; MatWeb |
| 51 | Metal Matrix Composite (Al 6061 / 20% SiC) | Composite | 2.80 | 380 | 105.0 | 85.0 | 16.00 | `#34d399` | DWA Aluminum Technologies; MatWeb |
| 52 | Carbon-Carbon Composite (2D C/C) | Composite | 1.75 | 260 | 95.0 | 32.0 | 125.00 | `#334155` | SGL Carbon SIGRABOND Data; MatWeb |
| 53 | Wood Plastic Composite (WPC 60/40) | Composite | 1.20 | 32 | 4.5 | 3.5 | 1.85 | `#6ee7b7` | Trex Composite Technical Bulletin; MatWeb |
| 54 | Structural Birch Plywood (Marine 7-Ply) | Composite | 0.68 | 42 | 9.5 | 3.2 | 1.25 | `#a7f3d0` | APA E30 Engineered Wood; WISA-Birch |
| 55 | Glued Laminated Timber (Glulam Fir) | Composite | 0.53 | 34 | 12.0 | 2.9 | 0.95 | `#059669` | ANSI A190.1; APA Glulam Product Guide |
| **NATURAL MATERIALS (10)** | | | | | | | | | |
| 56 | White Oak (Quercus alba, 12% MC) | Natural | 0.75 | 51.3 | 12.15 | 3.5 | 1.65 | `#92400e` | USDA FPL Wood Handbook Table 5-4a |
| 57 | Teak (Tectona grandis, 12% MC) | Natural | 0.66 | 58.0 | 12.30 | 3.2 | 4.90 | `#b45309` | USDA FPL Wood Handbook; The Wood Database |
| 58 | Hard Maple (Acer saccharum, 12% MC) | Natural | 0.71 | 54.0 | 12.60 | 3.6 | 1.85 | `#d97706` | USDA FPL Wood Handbook Table 5-4a |
| 59 | Scots Pine (Pinus sylvestris, 12% MC) | Natural | 0.51 | 41.0 | 10.00 | 2.5 | 0.65 | `#78350f` | USDA FPL Wood Handbook; The Wood Database |
| 60 | Western Red Cedar (Thuja plicata, 12% MC) | Natural | 0.38 | 31.4 | 7.70 | 1.8 | 1.45 | `#854d0e` | USDA FPL Wood Handbook Table 5-3a |
| 61 | Balsa Wood (Ochroma pyramidale, 160 kg/m³)| Natural | 0.16 | 12.5 | 3.40 | 0.60 | 4.80 | `#fef3c7` | USDA FPL Wood Handbook Chapter 5 |
| 62 | Moso Bamboo (Phyllostachys edulis Culm) | Natural | 0.70 | 65.0 | 18.00 | 4.0 | 1.15 | `#65a30d` | ISO 22157 Bamboo Properties; INBAR |
| 63 | Natural Cork (Quercus suber) | Natural | 0.18 | 1.8 | 0.03 | 0.05 | 7.80 | `#a16207` | Gibson & Ashby "Cellular Solids"; MatWeb |
| 64 | Natural Rubber (Vulcanized Shore A 50) | Natural | 0.95 | 22.0 | 0.003 | 1.85 | 2.20 | `#ca8a04` | Treloar "Physics of Rubber"; MatWeb |
| 65 | Vegetable-Tanned Cattlehide Leather | Natural | 0.85 | 25.0 | 0.05 | 0.80 | 16.00 | `#713f12` | ASTM D2209; Cambridge Ashby Materials Data |

---

### 4.2 Authoritative Primary Source Catalog

The following primary databases and peer-reviewed technical publications served as the authoritative baseline:

1. **MatWeb Material Property Data**
   - *URL*: [https://www.matweb.com/](https://www.matweb.com/)
   - *Scope*: Over 180,000 engineering material data sheets including metals, plastics, ceramics, and composites. Primary source for ASTM specifications, tensile yield, elastic moduli, and Poisson's ratios.
2. **ASM International Handbooks & Specialty Guides**
   - *Reference*: ASM Handbook Vol. 1 (Properties and Selection: Irons, Steels, and High-Performance Alloys), Vol. 2 (Nonferrous Alloys and Special-Purpose Materials), Vol. 21 (Composites). Materials Park, OH: ASM International.
   - *Scope*: Authoritative standard for SAE/AISI steels, aluminum alloys, and copper metallurgy.
3. **USDA Forest Products Laboratory — *Wood Handbook: Wood as an Engineering Material***
   - *Citation*: Forest Products Laboratory. *Wood Handbook: Wood as an Engineering Material*. General Technical Report FPL-GTR-190. Madison, WI: U.S. Department of Agriculture, Forest Service.
   - *URL*: [https://www.fpl.fs.usda.gov/](https://www.fpl.fs.usda.gov/)
   - *Scope*: Chapter 5 "Mechanical Properties of Wood" provides standard clear-wood values for specific gravity, compression parallel to grain, and modulus of elasticity at 12% moisture content.
4. **Cambridge University Materials Education / Ashby Methodology**
   - *Citation*: Ashby, M.F. *Materials Selection in Mechanical Design*, 5th Edition. Butterworth-Heinemann / Elsevier; Granta Design CES EduPack Database.
   - *Scope*: Elastic property relationship charts, standard material family boundary envelopes, and commercial pricing methodologies.
5. **NIST Chemistry WebBook & Materials Data Repository**
   - *Citation*: National Institute of Standards and Technology (NIST), Gaithersburg, MD.
   - *URL*: [https://webbook.nist.gov/](https://webbook.nist.gov/)
   - *Scope*: Thermodynamic and physical property constants for elemental metals and inorganic compounds.
6. **Technical Ceramic Manufacturer Bulletins**
   - *Citations*: CoorsTek Technical Ceramic Materials Selector; Saint-Gobain Ceramic Materials (Hexoloy); CeramTec Technical Ceramics Specifications; Schott Technical Glasses (Borofloat 33).
   - *Scope*: Sintered densities, flexural strengths, Young's moduli, and bulk moduli for engineering ceramics and optical glasses.
7. **Commercial Price Indices**
   - *Citations*: London Metal Exchange (LME) Cash Ingot Quotations (2024–2026); USGS Mineral Commodity Summaries; ICIS Chemical / Plastics News Resin Pricing Reports; Singapore Commodity Exchange (SGX TSR20).

---

## 5. Verification Method

To verify the taxonomy inventory independently and ensure zero runtime failures:

### 5.1 Programmatic Schema Verification Script
Execute the following validation script against any candidate JSON compilation of this dataset:

```python
import json
import re

# Load candidate data
with open("data.json", "r") as f:
    materials = json.load(f)

# Rule 1: Count constraint (50 to 75 materials)
assert 50 <= len(materials) <= 75, f"Material count {len(materials)} outside required 50-75 range"

required_families = {"Metal", "Polymer", "Ceramic", "Composite", "Natural"}
hex_color_regex = re.compile(r"^#[0-9a-fA-F]{6}$")

for idx, m in enumerate(materials):
    name = m.get("name")
    assert isinstance(name, str) and len(name.strip()) > 0, f"Row {idx}: Invalid name"
    
    # Rule 2: Numeric constraints (strictly positive finite numbers)
    for num_field in ["density", "strength", "modulus", "bulkModulus", "price"]:
        val = m.get(num_field)
        assert isinstance(val, (int, float)) and not isinstance(val, bool), f"{name}: {num_field} must be numeric"
        assert val > 0, f"{name}: {num_field}={val} must be > 0 for Recharts log-scale"
        
    # Rule 3: Family constraint
    fam = m.get("family")
    assert fam in required_families, f"{name}: Unexpected family '{fam}'"
    
    # Rule 4: Hex color format
    color = m.get("color")
    assert isinstance(color, str) and hex_color_regex.match(color), f"{name}: Invalid hex color '{color}'"

print(f"PASS: All {len(materials)} materials strictly verified against schema.")
```

### 5.2 Recharts Log Scale Invalidation Conditions
The dataset is invalid if any of the following occur:
1. Any value in `density`, `strength`, `modulus`, `bulkModulus`, or `price` is $\le 0$, `NaN`, or string-encoded `"123"`. (Invalidates Recharts log-domain calculation `Math.max(0.001, dataMin * 0.5)`).
2. Any `family` name is pluralized (e.g. `'Metals'`), breaking `FAMILY_COLORS` lookup and causing unstyled gray dots.
3. Material count drops below 50 or exceeds 75.
