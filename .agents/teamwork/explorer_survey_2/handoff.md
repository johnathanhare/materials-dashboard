# Handoff Report: Verification Methodology & Schema Validation Design

**Agent Identity**: Verification Methodology Explorer (`explorer_survey_2`)  
**Working Directory**: `/Users/johnathanhare/materials-dashboard/.agents/teamwork/explorer_survey_2`  
**Milestone**: Survey Phase  
**Handoff Type**: Hard Handoff (Investigation & Methodology Design Complete)  

---

## 1. Observation

### 1.1 Original User Request & Acceptance Criteria
From `/Users/johnathanhare/materials-dashboard/.agents/teamwork/ORIGINAL_REQUEST.md`:
- **Line 5**: `"Compile a massive static JSON database of real-world commercial materials (including polymers, woods, composites, metals, and ceramics) with their mechanical properties and estimated prices, using a team of agents to research and fact-check the data."`
- **Line 13**: `"Research and compile 50-75 common commercial and engineering materials across families (Metals, Polymers, Ceramics, Composites, Natural). Extract the following properties: Name, Density (g/cm³), Yield Strength (MPa), Young's Modulus (GPa), Bulk Modulus (GPa), Price ($/kg), Family, and Color (hex code)."`
- **Line 15-16**: `"Strict Fact-Checking: Do not guess or hallucinate values. Every data point must be actively researched and verified via web search or open databases. If accurate data cannot be found for a material, omit it."`
- **Line 18-20**: `"Output Deliverables: 1. A strongly typed data.json file containing the final array. 2. A Verification_Report.md detailing the methodology and sources used."`
- **Line 24-31**: Acceptance Criteria:
  - `data.json` contains exactly 50-75 materials.
  - Every material contains all required numeric fields (no nulls or strings for numeric properties).
  - `Verification_Report.md` includes links/citations for at least 3 primary sources used during research.
  - Independent programmatic validation of `data.json` schema before finishing to ensure it won't crash the Recharts frontend.

### 1.2 Frontend Codebase & Recharts Implementation
Inspected `/Users/johnathanhare/materials-dashboard/app/page.tsx`:
- **Lines 10-33**: The existing mock data schema establishes the exact object shape and casing:
  ```typescript
  { 
    name: 'Steel (AISI 1020)', 
    density: 7.85, 
    strength: 350, 
    modulus: 200, 
    bulkModulus: 140, 
    price: 0.5, 
    family: 'Metal', 
    color: '#64748b' 
  }
  ```
- **Lines 35-41**: Axis selection property bindings:
  - `density`: Density (`g/cm³`)
  - `strength`: Yield Strength (`MPa`)
  - `modulus`: Young's Modulus (`GPa`)
  - `bulkModulus`: Bulk Modulus (`GPa`)
  - `price`: Price (`$/kg`)
- **Lines 43-50**: Family classification keys and default UI colors:
  - `'Metal'`: `#ef4444` (Red)
  - `'Polymer'`: `#3b82f6` (Blue)
  - `'Composite'`: `#10b981` (Green)
  - `'Ceramic'`: `#f59e0b` (Orange)
  - `'Natural'`: `#8b5cf6` (Purple)
  - `'Computed (MP)'`: `#06b6d4` (Cyan - reserved for Materials Project API sync)
- **Lines 85-88**: Scatter plot data filter logic:
  ```typescript
  const hasX = mat[xAxisProperty.key] !== undefined && mat[xAxisProperty.key] > 0;
  const hasY = mat[yAxisProperty.key] !== undefined && mat[yAxisProperty.key] > 0;
  const matchesFamily = activeFamilies.includes(mat.family);
  return matchesSearch && hasX && hasY && matchesFamily;
  ```
- **Lines 280-294**: Recharts axes configuration:
  ```tsx
  <XAxis 
    type="number" 
    dataKey={xAxisProperty.key} 
    scale="log" 
    domain={[(dataMin: number) => Math.max(0.001, dataMin * 0.5), (dataMax: number) => dataMax * 1.5]}
    allowDataOverflow={true}
  />
  <YAxis 
    type="number" 
    dataKey={yAxisProperty.key} 
    scale="log" 
    domain={[(dataMin: number) => Math.max(0.001, dataMin * 0.5), (dataMax: number) => dataMax * 1.5]}
    allowDataOverflow={true}
  />
  ```
  *Critical Observation*: Both X and Y axes utilize logarithmic scaling (`scale="log"`). In d3/Recharts, non-positive numbers ($\le 0$), `null`, `undefined`, `NaN`, or string values evaluate to invalid logarithmic coordinates ($\log(x)$ undefined for $x \le 0$), causing catastrophic SVG rendering errors, white-screen crashes, or silent data point omission.

### 1.3 Material Project Elastic Conversion Reference
Inspected `/Users/johnathanhare/materials-dashboard/app/actions.ts`:
- **Lines 38-44**: Shows the elasticity relationship used by the app for converting Voigt-Reuss-Hill bulk modulus $K$ and shear modulus $G$ to Young's modulus $E$:
  ```typescript
  const K = mat.bulk_modulus?.vrh || 0; 
  const G = mat.shear_modulus?.vrh || 0; 
  let E = 0;
  if (K > 0 && G > 0) {
    E = (9 * K * G) / (3 * K + G);
  }
  ```

### 1.4 Peer Survey Agent Status
- Inspected `.agents/teamwork/explorer_survey_1/BRIEFING.md`:
  - `explorer_survey_1` has designated a 65-material catalog target (comfortably within the 50-75 acceptance range), distributed as: 17 Metals, 16 Polymers, 12 Ceramics, 10 Composites, 10 Natural materials.
  - Aligned schema keys: `name`, `density`, `strength`, `modulus`, `bulkModulus`, `price`, `family`, `color`.

---

## 2. Logic Chain

1. **Premise 1 (Zero Hallucination Requirement)**: `ORIGINAL_REQUEST.md` (lines 15-16) strictly forbids guessing or hallucinating values. Data must be actively researched from open databases and authoritative literature. If an accurate property value cannot be verified for a specific material grade, that material must be excluded.
2. **Premise 2 (Recharts Log-Scale Robustness)**: `app/page.tsx` (lines 280-294) plots all numeric properties on a logarithmic scale. Mathematically, $\log(x)$ is defined only on $x \in (0, \infty)$. Therefore:
   - Any property $\le 0$ will break axis calculations.
   - Any `null`, `undefined`, or `NaN` will break SVG coordinate generation.
   - Any string representation (e.g. `"200"` or `"$0.50"`) will cause type coercion errors in Recharts.
   - Every property value for `density`, `strength`, `modulus`, `bulkModulus`, and `price` must be a strictly positive finite number (`typeof val === 'number' && Number.isFinite(val) && val > 0`).
3. **Premise 3 (Bulk Modulus Analytical Standard)**: Bulk modulus $K$ is rarely tabulated directly in standard commercial polymer or metal supplier datasheets, whereas Young's Modulus $E$ and Poisson's ratio $\nu$ are standard tensile test measurements (ASTM E8, ASTM E111, ASTM D638).
   - In continuum mechanics, the generalized isotropic relation gives:
     $$K = \frac{E}{3(1 - 2\nu)}$$
   - To prevent arbitrary estimation, $K$ must be derived using verified, cited Poisson's ratios from authoritative handbooks (ASM, MatWeb, Ashby).
   - For anisotropic materials (woods and unidirectional composites), true bulk modulus requires tensor summation $\frac{1}{K} = \sum S_{ij}$. For practical Ashby chart compatibility, an effective volumetric bulk modulus must be calculated from empirical compliance averages or documented Ashby reference values.
4. **Premise 4 (Commercial Pricing Normalization)**: Material prices fluctuate widely based on order quantity, processing form, and date. To achieve meaningful comparison across material classes in an Ashby plot:
   - Pricing must reflect standard commercial wholesale commodity order volumes (metric ton / truckload scale or standard mill stock) in USD per kilogram ($\$/\text{kg}$).
   - Retail distributor catalog prices (e.g., McMaster-Carr) and small-quantity markups must be excluded.
   - Prices must be anchored to recent stable commercial market averages (2023–2026).
5. **Premise 5 (Schema & Pipeline Validation Guardrail)**: The acceptance criteria require programmatic validation before finishing. A dedicated zero-dependency Node.js test script (`scripts/validate_data.js`) will execute automatically in the project CI/build lifecycle, verifying:
   - Count between 50 and 75.
   - Strict numeric types, positive non-zero values, and realistic physical range boundaries.
   - Valid hex color regex (`/^#[0-9a-fA-F]{6}$/`).
   - Valid family classification matching frontend constants.
   - Name uniqueness.
6. **Premise 6 (Verification Report Structure)**: To satisfy R3 and acceptance criteria, `Verification_Report.md` must provide comprehensive methodological documentation, at least 3 primary source citations with full URLs, a complete data audit table, derivation formulas, pricing notes, and verification test logs.

---

## 3. Caveats

1. **Ceramic Yield Strength Convention**: Brittle ceramics (e.g., Alumina, Silicon Carbide) do not exhibit plastic yield in standard tensile tests; they fail by brittle cleavage at fracture stress ($\sigma_f$), with compressive strengths typically $5\times - 10\times$ higher than tensile strength. In materials selection charts (Ashby conventions) and engineering databases, the design yield strength for ceramics is universally taken as the compressive yield / compressive strength or flexural strength (Modulus of Rupture, MOR). The verification protocol must document this convention explicitly so downstream auditors do not misinterpret ceramic strength values.
2. **Anisotropic Wood and Composite Approximations**: Wood is orthotropic (Longitudinal, Radial, Tangential), and composites like CFRP are transversely isotropic or orthotropic. A single scalar Young's modulus and Bulk modulus represents the effective longitudinal or quasi-isotropic engineering property. Longitudinal modulus ($E_L$) and volumetric bulk modulus ($K_{eff}$) must be clearly annotated in `Verification_Report.md`.
3. **Temporal Pricing Volatility**: Bulk commodity prices (LME aluminum, copper, steel scrap, crude-oil-derived polymer resins) fluctuate on weekly exchange cycles. The prices in `data.json` represent standardized 2023–2026 commercial benchmark averages for relative engineering comparison, not live spot quotes.
4. **Wood Moisture Content**: All timber physical properties (density, modulus, strength) are standardized to 12% equilibrium moisture content (EMC, dry air condition) per USDA Forest Products Laboratory standards.

---

## 4. Conclusion & Complete Design Specifications

### 4.1 Strict Fact-Checking Protocol & Authoritative Primary Sources

#### Zero Hallucination Rule
1. **Source Mandate**: Every data point in `data.json` must be extracted directly from an approved authoritative primary source or derived via an explicit mechanical formula with cited parameters.
2. **Omission over Estimation**: If a material lacks verified properties across any of the required attributes, it must be excluded from the database.
3. **Grade Specificity**: Materials must not be cataloged with generic, ambiguous names. The alloy grade, temper condition, resin formulation, or wood species must be explicitly specified (e.g., `Aluminum (6061-T6)`, `Stainless Steel (AISI 316L)`, `Polycarbonate (Unfilled)`, `Oak (White, Dry)`, `CFRP (Unidirectional Carbon/Epoxy)`).

#### Authoritative Primary Source Catalog (Tier 1 & Tier 2)

| Source Name | Organization / Author | Category | URL / Access Method | Primary Utility |
|---|---|---|---|---|
| **MatWeb Material Property Data** | MatWeb, LLC / Automation Creations | Engineering Database | `https://www.matweb.com` | Primary datasheet reference for over 180,000 metals, polymers, and ceramics (ASTM/ISO certified). |
| **Ashby Materials Selection Database** | Prof. M.F. Ashby / Cambridge University / Granta Design | Reference Literature | *Materials Selection in Mechanical Design* (4th/5th ed., Butterworth-Heinemann); CES EduPack | Industry-standard benchmark for property correlation, Ashby chart envelopes, and bulk modulus baselines. |
| **NIST Standard Reference Data & Ceramics WebBook** | National Institute of Standards and Technology (NIST) | Government Standard | `https://www.nist.gov/srd`, `https://srdata.nist.gov/cerabeads/` | SRD 30 Structural Ceramics Database; definitive physical and elastic constants for high-purity ceramics. |
| **USDA Forest Products Laboratory (FPL)** | USDA Forest Service | Federal Research Lab | `https://www.fpl.fs.usda.gov` (Wood Handbook FPL-GTR-190 / FPL-GTR-282) | Definitive source for domestic and commercial timber density at 12% MC, parallel MOE, MOR, and compression strength. |
| **ASM International Materials Information** | ASM International | Professional Society | `https://www.asminternational.org` (ASM Handbooks Vols. 1 & 2) | Authoritative reference for ferrous and non-ferrous metallic alloys, UNS specifications, heat treatments, and Poisson's ratios. |
| **The Wood Database** | Eric Meier | Technical Database | `https://www.wood-database.com` | Peer-referenced timber properties citing USDA FPL and CIRAD forestry test data. |
| **Omnexus / UL Prospector** | SpecialChem / UL LLC | Polymer Industry Portal | `https://omnexus.specialchem.com` | Technical data sheets for commercial thermoplastic and thermoset resin grades (ISO 527 / ASTM D638). |
| **London Metal Exchange (LME)** | London Metal Exchange | Commodity Exchange | `https://www.lme.com` | Real-world benchmark cash settlement prices for base metals (Al, Cu, Ni, Zn, Pb, Sn). |
| **USGS Mineral Commodity Summaries** | U.S. Geological Survey | Government Geological Survey | `https://pubs.usgs.gov/periodicals/mcs` | Annual benchmark prices for titanium sponge, tungsten, rare earths, and industrial minerals. |
| **Plastics News / ICIS Pricing** | Crain Communications / ICIS | Chemical Market Reporting | `https://www.plasticsnews.com`, `https://www.icis.com` | Commercial wholesale polymer resin contract and spot pricing in bulk metric tons. |

---

### 4.2 Calculation & Derivation Standard for Bulk Modulus ($K$)

#### 1. Isotropic Elastic Materials (Metals, Ceramics, Unoriented Polymers)
For isotropic materials, Bulk Modulus $K$ is calculated directly from Young's Modulus ($E$) and Poisson's Ratio ($\nu$):

$$K = \frac{E}{3(1 - 2\nu)}$$

Where:
- $E$ is Young's Modulus in GPa.
- $\nu$ is the dimensionless Poisson's ratio ($0 \le \nu < 0.5$).
- $K$ is the resulting Bulk Modulus in GPa.

When shear modulus $G$ is known alongside $E$, the relationship is:
$$K = \frac{E \cdot G}{3(3G - E)}$$

#### 2. Authoritative Poisson's Ratio Citation Table

| Material Family / Class | Representative Alloys / Grades | Standard Poisson's Ratio ($\nu$) | Source Reference |
|---|---|---|---|
| **Carbon & Alloy Steels** | AISI 1020, 1045, 4140, 4340 | $0.29$ | ASM Handbook Vol. 1 / MatWeb |
| **Stainless Steels** | AISI 304, 316, 410, 17-4PH | $0.29 - 0.30$ | ASM Handbook Vol. 1 |
| **Aluminum Alloys** | AA 6061-T6, 7075-T6, 2024-T3 | $0.33$ | ASM Handbook Vol. 2 / MIL-HDBK-5J |
| **Titanium Alloys** | Ti-6Al-4V (Grade 5), CP Titanium | $0.342$ | MMPDS-01 / MatWeb |
| **Copper & Brasses** | C11000 Copper, C36000 Brass | $0.34$ | CDA / MatWeb |
| **Magnesium Alloys** | AZ31B-H24, AZ91D | $0.35$ | ASM Handbook Vol. 2 |
| **Nickel Superalloys** | Inconel 718, Inconel 625 | $0.29$ | Special Metals TDS / MatWeb |
| **Monolithic Ceramics** | Alumina ($\text{Al}_2\text{O}_3$), Silicon Nitride ($\text{Si}_3\text{N}_4$) | $0.22 - 0.24$ | NIST SRD 30 / Ashby |
| **Silicon Carbide ($\text{SiC}$)** | Sintered Alpha SiC | $0.17$ | NIST SRD 30 / Saint-Gobain TDS |
| **Zirconia ($\text{ZrO}_2$)** | Y-TZP | $0.31$ | NIST SRD 30 |
| **Glasses** | Soda-Lime Glass, Borosilicate | $0.20 - 0.22$ | Corning / Ashby |
| **Rigid Thermoplastics** | Polycarbonate, Rigid PVC, PMMA | $0.37 - 0.38$ | Modern Plastics Handbook / MatWeb |
| **Polyolefins & Nylons** | HDPE, Polypropylene, Nylon 6/6 | $0.39 - 0.41$ | Polymer Data Handbook / Omnexus |
| **Fluoropolymers** | PTFE (Teflon) | $0.46$ | DuPont Teflon TDS |
| **Thermoset Resins** | Epoxy (Unfilled Bisphenol-A) | $0.35$ | MatWeb / Ashby |

#### 3. Anisotropic Materials Standard (Wood and Fiber Composites)
- **Wood**: Orthotropic structure with longitudinal modulus ($E_L$) dominating transverse moduli ($E_R, E_T \approx 0.05 - 0.10 E_L$). Hydrostatic bulk compliance is dominated by the cellular transverse collapse, yielding an effective bulk modulus $K_{eff} \approx 1.0 - 2.5 \text{ GPa}$ for commercial hardwoods and $0.6 - 1.5 \text{ GPa}$ for softwoods. The compiler must use experimental bulk modulus values documented in Ashby (*Materials Selection in Mechanical Design*, Chapter 4 Appendix) or empirical compliance averages.
- **Continuous Fiber Composites**: For unidirectional and quasi-isotropic CFRP/GFRP, bulk modulus is governed by the resin matrix and fiber transverse bulk modulus:
  - CFRP (Epoxy Matrix): $K \approx 15 - 25 \text{ GPa}$
  - GFRP (Glass/Epoxy or Glass/Polyester): $K \approx 12 - 18 \text{ GPa}$
  - Aramid / Kevlar Composite: $K \approx 10 - 15 \text{ GPa}$

#### 4. Numerical Standard
- Computed values of $K$ must be rounded to 1 decimal place (or 2 decimal places if $K < 10 \text{ GPa}$) to avoid floating-point representation artifacts (e.g., `140.0` or `3.33` instead of `3.3333333333333335`).
- Under no circumstances may $K \le 0$.

---

### 4.3 Commercial Price Estimation Methodology

#### 1. Baseline Procurement Rules
- **Volume**: Commercial truckload / wholesale container volume ($> 1,000 \text{ kg}$ or metric ton lots).
- **Form Normalization**:
  - Metals: Standard semi-finished extrusion billet, hot-rolled bar, or wire rod stock.
  - Polymers: Standard injection molding or extrusion virgin pellet resin in 25-kg bags / super-sacks.
  - Ceramics: Sintered structural stock / engineering powder blanks / bulk float glass sheets.
  - Composites: Standard industrial cured flat sheet laminate or pultruded profile.
  - Wood: Kiln-dried dimensional lumber stock.
- **Units**: Standardized strictly to USD per kilogram ($\$/\text{kg}$).

#### 2. Conversion Formulae

$$\text{Price}(\$/\text{kg}) = \frac{\text{Price}(\$/\text{metric ton})}{1000}$$

$$\text{Price}(\$/\text{kg}) = \text{Price}(\$/\text{lb}) \times 2.20462$$

For Lumber quoted in Thousand Board Feet ($\$/\text{MBF}$):
$$1 \text{ MBF} = 2.359737 \text{ m}^3$$

$$\text{Price}(\$/\text{kg}) = \frac{\text{Price}(\$/\text{MBF})}{2.359737 \times \rho_{\text{wood}} (\text{kg/m}^3)}$$

*(Where $\rho_{\text{wood}} = \text{density in g/cm}^3 \times 1000$).*

#### 3. Family Commercial Price Brackets (2023–2026 Reference Benchmarks)

| Material Category | Typical Commercial Range ($/kg) | Reference Basis |
|---|---|---|
| **Carbon & Structural Steels** | $\$0.50 - \$1.10$ | S&P Global Platts hot-rolled coil / rebar benchmark |
| **Alloy Steels (4140, 4340)** | $\$1.20 - \$2.20$ | Specialty steel mill billet index |
| **Stainless Steels (304, 316)** | $\$2.50 - \$4.80$ | Fastmarkets / MEPS Stainless Steel index (Ni/Cr surcharges) |
| **Aluminum Alloys (6061, 5052)** | $\$2.20 - \$4.50$ | LME Cash Settlement + Midwest Premium + extrusion fee |
| **Copper & Brasses** | $\$8.00 - \$12.00$ | LME Cash Grade A Copper + alloying spread |
| **Titanium (Ti-6Al-4V)** | $\$18.00 - \$35.00$ | USGS Titanium Sponge / Aerospace mill ingot |
| **Nickel Superalloys (Inconel 718)**| $\$35.00 - \$60.00$ | Specialty Metals / LME Nickel + Mo/Nb alloy premium |
| **Commodity Polymers (PE, PP, PVC, PS)**| $\$1.10 - \$1.80$ | Plastics News / ICIS bulk virgin resin contract prices |
| **Engineering Polymers (ABS, PC, Nylon 6/6)**| $\$2.20 - \$5.50$ | ICIS North America / European engineering resin prices |
| **Specialty High-Performance Polymers (PTFE, PEEK)**| $\$15.00 - \$110.00$ | SpecialChem / Victrex PEEK / Chemours Teflon contract |
| **Commodity Ceramics (Concrete, Brick)**| $\$0.05 - \$0.25$ | USGS Cement & Concrete commodity survey |
| **Soda-Lime / Borosilicate Glass** | $\$0.50 - \$2.50$ | Industrial flat float glass bulk commodity index |
| **Technical Ceramics (Alumina, SiC, Si3N4, Zirconia)**| $\$10.00 - \$80.00$ | Industrial sintered blanks / Saint-Gobain / CoorsTek |
| **Cemented Carbides (Tungsten Carbide WC-Co)**| $\$45.00 - \$80.00$ | USGS Tungsten / Hardmetal preform prices |
| **GFRP (Fiberglass Composite)** | $\$3.50 - \$7.00$ | Pultruded structural fiberglass profile commodity index |
| **CFRP (Carbon Fiber Composite)** | $\$25.00 - \$45.00$ | Industrial standard modulus carbon fiber prepreg/plate |
| **Softwoods (Pine, Fir, Spruce)** | $\$0.40 - \$0.90$ | Random Lengths Framing Lumber Composite Index |
| **Hardwoods (Oak, Maple, Walnut, Teak)** | $\$1.20 - \$6.00$ | Hardwood Market Report / US Forest Service kiln-dried lumber |
| **Balsa Wood** | $\$5.00 - \$10.00$ | Industrial core material blocks (high $/kg due to very low density) |
| **Natural Rubber** | $\$1.80 - \$2.80$ | Singapore Exchange (SGX) TSR20 / RSS3 rubber benchmark |

---

### 4.4 Programmatic Schema Validation Script Design

#### Validation Requirements Specification
The validation script must programmatically enforce 100% data integrity before completing the deliverables:
1. **File Existence & JSON Validity**: Checks that the file exists and is parseable JSON.
2. **Item Count Constraint**: Must contain between 50 and 75 items (`length >= 50 && length <= 75`).
3. **Required Fields Check**: Every record must contain: `name`, `density`, `strength`, `modulus`, `bulkModulus`, `price`, `family`, `color`.
4. **Strict Numeric Type & Positive Constraint**:
   - `typeof val === 'number'`
   - `!Number.isNaN(val)`
   - `Number.isFinite(val)`
   - `val > 0` (Essential for Recharts `scale="log"`).
5. **Physical Plausibility Boundaries**:
   - `density`: $0.05 \le \rho \le 25.0 \text{ g/cm}^3$
   - `strength`: $1.0 \le \sigma_y \le 10,000.0 \text{ MPa}$
   - `modulus`: $0.001 \le E \le 1,500.0 \text{ GPa}$
   - `bulkModulus`: $0.001 \le K \le 1,000.0 \text{ GPa}$
   - `price`: $0.01 \le \text{price} \le 10,000.0 \text{ \$/kg}$
6. **Family Enum Constraint**:
   Must exactly match: `['Metal', 'Polymer', 'Ceramic', 'Composite', 'Natural']`.
7. **Color Hex Regex**:
   Must match `/^#[0-9a-fA-F]{6}$/`.
8. **Uniqueness**:
   All material `name` values must be unique.

#### Complete Validation Script Implementation Design
The script is designed as a standalone, zero-dependency Node.js script located at `scripts/validate_data.js`:

```javascript
#!/usr/bin/env node

/**
 * Programmatic Schema Validation Script for data.json
 * Validates against ORIGINAL_REQUEST.md acceptance criteria and Recharts frontend constraints.
 * 
 * Usage: node scripts/validate_data.js [path/to/data.json]
 */

const fs = require('fs');
const path = require('path');

const VALID_FAMILIES = new Set(['Metal', 'Polymer', 'Ceramic', 'Composite', 'Natural']);
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

const PHYSICAL_BOUNDS = {
  density: { min: 0.05, max: 25.0, unit: 'g/cm³' },
  strength: { min: 1.0, max: 10000.0, unit: 'MPa' },
  modulus: { min: 0.001, max: 1500.0, unit: 'GPa' },
  bulkModulus: { min: 0.001, max: 1000.0, unit: 'GPa' },
  price: { min: 0.01, max: 10000.0, unit: '$/kg' }
};

function validateDataset(filePath) {
  console.log(`=======================================================`);
  console.log(`  MATERIALS DATABASE VALIDATION SUITE`);
  console.log(`  Target: ${filePath}`);
  console.log(`=======================================================\n`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ CRITICAL: File not found at path: ${filePath}`);
    process.exit(1);
  }

  let rawContent;
  try {
    rawContent = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`❌ CRITICAL: Failed to read file: ${err.message}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(rawContent);
  } catch (err) {
    console.error(`❌ CRITICAL: Malformed JSON syntax: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(data)) {
    console.error(`❌ CRITICAL: Root JSON structure must be an Array. Found: ${typeof data}`);
    process.exit(1);
  }

  const errors = [];
  const warnings = [];
  const seenNames = new Set();
  const familyCounts = {};

  // Check 1: Count Acceptance Criteria (50-75 materials)
  const count = data.length;
  console.log(`🔍 Checking Material Count: Found ${count} materials.`);
  if (count < 50 || count > 75) {
    errors.push(`ACCEPTANCE CRITERIA VIOLATION: Dataset must contain between 50 and 75 materials. Found: ${count}`);
  } else {
    console.log(`  ✅ Count valid (50 <= ${count} <= 75).`);
  }

  // Check 2: Element-by-element verification
  data.forEach((mat, idx) => {
    const loc = `Index [${idx}] (${mat && mat.name ? mat.name : 'Unknown'})`;

    if (!mat || typeof mat !== 'object') {
      errors.push(`${loc}: Entry is not a valid object.`);
      return;
    }

    // Name check
    if (!mat.name || typeof mat.name !== 'string' || !mat.name.trim()) {
      errors.push(`${loc}: 'name' must be a non-empty string.`);
    } else {
      const trimmedName = mat.name.trim();
      if (seenNames.has(trimmedName)) {
        errors.push(`${loc}: Duplicate material name detected: '${trimmedName}'.`);
      }
      seenNames.add(trimmedName);
    }

    // Family check
    if (!mat.family || !VALID_FAMILIES.has(mat.family)) {
      errors.push(`${loc}: 'family' must be one of [${Array.from(VALID_FAMILIES).join(', ')}]. Found: '${mat.family}'`);
    } else {
      familyCounts[mat.family] = (familyCounts[mat.family] || 0) + 1;
    }

    // Color check
    if (!mat.color || typeof mat.color !== 'string' || !HEX_COLOR_REGEX.test(mat.color)) {
      errors.push(`${loc}: 'color' must be a valid 6-character hex code (e.g. '#64748b'). Found: '${mat.color}'`);
    }

    // Numeric properties check
    const numericKeys = ['density', 'strength', 'modulus', 'bulkModulus', 'price'];
    for (const key of numericKeys) {
      const val = mat[key];
      if (val === undefined || val === null) {
        errors.push(`${loc}: Missing required numeric property '${key}'. Found: ${val}`);
        continue;
      }
      if (typeof val !== 'number') {
        errors.push(`${loc}: Property '${key}' must be of type 'number'. Found: ${typeof val} ('${val}')`);
        continue;
      }
      if (Number.isNaN(val) || !Number.isFinite(val)) {
        errors.push(`${loc}: Property '${key}' must be a finite number. Found: ${val}`);
        continue;
      }
      // Recharts log-scale requirement
      if (val <= 0) {
        errors.push(`${loc}: Property '${key}' must be strictly > 0 for Recharts log scale. Found: ${val}`);
        continue;
      }

      // Physical bounds sanity check
      const bound = PHYSICAL_BOUNDS[key];
      if (val < bound.min || val > bound.max) {
        warnings.push(`${loc}: Value for '${key}' (${val} ${bound.unit}) falls outside normal range [${bound.min}, ${bound.max}].`);
      }
    }
  });

  // Print Summary Table
  console.log(`\n📊 Family Distribution Summary:`);
  for (const fam of VALID_FAMILIES) {
    console.log(`  - ${fam.padEnd(12)}: ${familyCounts[fam] || 0} materials`);
  }

  // Print Warnings
  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${warnings.length}):`);
    warnings.slice(0, 10).forEach(w => console.log(`  [WARN] ${w}`));
    if (warnings.length > 10) console.log(`  ... and ${warnings.length - 10} more warnings.`);
  }

  // Print Result
  console.log(`\n=======================================================`);
  if (errors.length > 0) {
    console.error(`❌ VALIDATION FAILED with ${errors.length} error(s):`);
    errors.forEach(e => console.error(`  [ERROR] ${e}`));
    console.error(`=======================================================\n`);
    process.exit(1);
  } else {
    console.log(`✅ VALIDATION PASSED: All ${count} materials conform strictly to schema!`);
    console.log(`   - 0 nulls, 0 NaN, 0 strings in numeric properties`);
    console.log(`   - All values strictly > 0 (100% Recharts log-scale compatible)`);
    console.log(`   - Hex color codes verified`);
    console.log(`=======================================================\n`);
    process.exit(0);
  }
}

const targetPath = process.argv[2] || path.resolve(process.cwd(), 'data.json');
validateDataset(targetPath);
```

---

### 4.5 Structure & Outline of `Verification_Report.md`

`Verification_Report.md` will be generated during the implementation phase and placed at `/Users/johnathanhare/materials-dashboard/Verification_Report.md`. It must contain the following formal sections:

```markdown
# Verification Report: Real-World Commercial Engineering Materials Database

## 1. Executive Summary & Attestation
- Formal statement of compliance with ORIGINAL_REQUEST.md.
- Material count verification (total count: exactly 50-75).
- Composition breakdown across 5 families:
  - Metals: N count
  - Polymers: N count
  - Ceramics: N count
  - Composites: N count
  - Natural: N count
- Zero-hallucination attestation: formal sign-off confirming zero guessed values and 100% traceability to authoritative sources.

## 2. Authoritative Primary Sources & Database Catalog
- Detailed descriptions, institutional credentials, and direct URLs for primary databases:
  1. MatWeb Material Property Data (https://www.matweb.com)
  2. Cambridge Materials Selector / Ashby Materials Selection in Mechanical Design (M.F. Ashby)
  3. NIST Standard Reference Data & Ceramics WebBook (https://srdata.nist.gov/cerabeads/)
  4. USDA Forest Products Laboratory: Wood Handbook FPL-GTR-190/282 (https://www.fpl.fs.usda.gov)
  5. ASM International Handbooks (https://www.asminternational.org)
  6. The Wood Database (https://www.wood-database.com)
  7. Commodity Exchanges: London Metal Exchange (LME) and USGS Mineral Commodity Summaries

## 3. Physical Property Standards & Measurement Procedures
- Density (g/cm³): standard test conditions at 20-25°C (ASTM D792, ASTM B311).
- Yield Strength (MPa): 0.2% offset yield for metals (ASTM E8), tensile yield for polymers (ASTM D638), compressive yield / modulus of rupture for ceramics (ASTM C1161), compression parallel to grain for woods.
- Young's Modulus (GPa): static tensile modulus (ASTM E111, ASTM D638).
- Bulk Modulus (GPa): hydrostatic volumetric elasticity derivation and testing standard.
- Estimated Commercial Price ($/kg): wholesale bulk commodity pricing rules in 2023-2026 USD.
- Color (Hex Code): family color assignments matching frontend UI.

## 4. Bulk Modulus Mathematical Derivation Standards
- Analytical formulation for isotropic solids: K = E / (3*(1 - 2*nu)).
- Documented Poisson's ratio citation table across metallic, polymeric, and ceramic classes.
- Volumetric compliance and effective bulk modulus formulation for orthotropic woods and continuous fiber composites.
- Rounding and non-zero positive constraints.

## 5. Commercial Pricing Estimation Methodology
- Metric ton and pound-to-kilogram conversion standards.
- Wholesale volume baseline definition (>1,000 kg commodity orders).
- Commercial price brackets table by material family.
- Clarification on market fluctuation and relative comparative fidelity in Ashby selection plots.

## 6. Comprehensive Materials Verification Catalog
- Complete master table of all compiled materials with verified values and citations:
| # | Material Name | Family | Density (g/cm³) | Yield Strength (MPa) | Young's Modulus (GPa) | Bulk Modulus (GPa) | Price ($/kg) | Color | Primary Source Citation & Notes |
... [50-75 fully verified rows] ...

## 7. Programmatic Schema Validation Results
- Verbatim console output from `node scripts/validate_data.js data.json`.
- Proof of zero validation errors.
- Confirmation of Recharts frontend log-scale safety.
```

---

## 5. Verification Method

To independently verify the methodology and implementation readiness:

1. **Verify Codebase Alignment**:
   - Inspect `app/page.tsx` lines 10-50, 85-88, 280-294 to confirm that the schema keys (`name`, `density`, `strength`, `modulus`, `bulkModulus`, `price`, `family`, `color`), log-scale constraints ($> 0$), and family names match the design.
2. **Verify Programmatic Validation Script**:
   - The validation script logic can be verified against a test fixture by running:
     ```bash
     node -e "const fs = require('fs'); const d = JSON.parse(fs.readFileSync('app/page.tsx','utf8').match(/const initialMockMaterials = (\[[\s\S]*?\]);/)[1].replace(/'/g, '\"').replace(/(\w+):/g, '\"\$1\":').replace(/,\s*\]/, ']')); console.log('Mock items:', d.length);"
     ```
3. **Invalidation Conditions**:
   - Any property in `data.json` containing `null`, `undefined`, `NaN`, string representations, or numbers $\le 0$ will immediately invalidate the verification suite.
   - Any dataset containing fewer than 50 or more than 75 materials will fail validation.
   - Any citation lacking an authoritative primary database link in `Verification_Report.md` will fail audit review.
