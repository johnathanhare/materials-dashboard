# Test Infrastructure & Validation Suite Architecture

**Project**: Commercial Materials Database & Dashboard (`materials-dashboard`)  
**Component**: Static Materials Catalog (`data.json`, `public/data.json`)  
**Runner**: `scripts/validate_data.js`  
**Test Framework**: Zero-dependency standalone Node.js validation runner  

---

## 1. Overview & Architecture

The test infrastructure provides an automated, opaque-box validation suite designed to enforce strict schema integrity, physical realism, and frontend rendering safety for the materials database.

Because the interactive frontend (`app/page.tsx`) renders dynamic Ashby property charts using Recharts with logarithmic axes (`scale="log"`), any non-positive number ($\le 0$), missing attribute, `null`, `NaN`, or string-encoded number causes fatal SVG rendering crashes or silent data omission.

The test runner operates across four defensive validation tiers:

```
+-------------------------------------------------------------------------------+
|                      MATERIALS DATABASE VALIDATION RUNNER                     |
|                           (scripts/validate_data.js)                          |
+-------------------------------------------------------------------------------+
         |
         +--> [Tier 1: Feature Coverage]
         |    - Record count: 50 <= N <= 75
         |    - Complete schema: 8 mandatory fields
         |    - Exact data types (number, string)
         |    - Name uniqueness (no duplicates)
         |    - Family enum: 'Metal' | 'Polymer' | 'Ceramic' | 'Composite' | 'Natural'
         |    - All 5 families represented in catalog
         |
         +--> [Tier 2: Boundary & Corner Cases]
         |    - Strict positivity: value > 0 for all 5 numeric fields (Recharts log safety)
         |    - Subnormal & near-zero guard (< 1e-6)
         |    - Physical property boundaries (Density, Strength, Moduli, Price)
         |    - Recharts dynamic axis domain calculation: [max(0.001, min * 0.5), max * 1.5]
         |    - Strict 6-digit hex color format: /^#[0-9A-Fa-f]{6}$/
         |
         +--> [Tier 3: Cross-Feature Combinations]
         |    - Elasticity ratio check: 0.05 <= K/E <= 50.0 (up to 2000 for hyperelastic rubbers)
         |    - Yield strain limit: sigma_y / (1000 * E) <= 0.15 (15% Hookean elastic limit)
         |    - Family-density physical plausibility (Metals >= 1.0, timber biomass plausibility)
         |    - Dual-file parity: data.json <-> public/data.json semantic & count equality
         |
         +--> [Tier 4: Recharts Frontend Simulation]
              - Exhaustive 20 directed axis-pair simulations: hasX && hasY && matchesFamily
              - 100% material survival through frontend filter
              - Mathematical log10 coordinate projection check (no NaN / Infinity)
              - Family isolation toggle check (non-empty rendered sets)
              - Tooltip string interpolation simulation
```

---

## 2. The 4 Validation Tiers

### Tier 1: Feature Coverage
Validates the structural and categorical requirements established in `PROJECT.md` and `ORIGINAL_REQUEST.md`:
1. **Material Count**: Enforces $50 \le N \le 75$. Target catalog is 65 materials.
2. **Mandatory Schema Properties**: Every material object must contain:
   - `name`: string
   - `density`: number ($> 0$, g/cm³)
   - `strength`: number ($> 0$, MPa)
   - `modulus`: number ($> 0$, GPa)
   - `bulkModulus`: number ($> 0$, GPa)
   - `price`: number ($> 0$, $/kg)
   - `family`: string enum
   - `color`: string hex code
3. **Strict Type Checking**: Numeric fields must have `typeof val === 'number'`, must not be `null`, `undefined`, `NaN`, or string-encoded numbers (e.g. `"200"`).
4. **Name Uniqueness**: Case-insensitive and whitespace-trimmed uniqueness check to prevent duplicate entries.
5. **Family Enum Constraint**: Must strictly be one of `'Metal'`, `'Polymer'`, `'Ceramic'`, `'Composite'`, `'Natural'`.
6. **Family Representation**: Verifies that all 5 families are populated with at least one representative material.

### Tier 2: Boundary & Corner Cases
Enforces mathematical stability for Recharts log-scale axes and physical realism bounds:
1. **Log-Scale Positivity**: Recharts logarithmic scales compute $\log(x)$, which is undefined for $x \le 0$. Any property value $\le 0$ will trigger a fatal Tier 2 error.
2. **Subnormal Guard**: Flags numbers $< 10^{-6}$ as unphysical subnormal values that distort log axis scaling.
3. **Physical Property Boundaries**:
   | Property | Min | Max | Unit | Basis |
   |---|---|---|---|---|
   | `density` | 0.05 | 25.0 | g/cm³ | Lightest aerogels/balsa to heaviest osmium/tungsten |
   | `strength` | 1.0 | 10,000.0 | MPa | Weakest foams/cork to ultra-high-strength whiskers |
   | `modulus` | 0.001 | 1,500.0 | GPa | Soft rubbers/gels to diamond/carbon nanotubes |
   | `bulkModulus` | 0.001 | 1,000.0 | GPa | Soft polymers to diamond |
   | `price` | 0.01 | 10,000.0 | $/kg | Crushed stone/aggregate to exotic precious metals |
4. **Axis Domain Calculation Simulation**: Simulates the exact calculation used by `app/page.tsx`:
   $$\text{domainMin} = \max(0.001, \text{dataMin} \times 0.5)$$
   $$\text{domainMax} = \text{dataMax} \times 1.5$$
   Ensures $\text{domainMin} > 0$ and $\text{domainMax} > \text{domainMin}$ for all 5 numeric properties.
5. **Hex Color Validation**: Enforces exact regex `/^#[0-9A-Fa-f]{6}$/`. Rejects named colors (`'red'`), 3-digit shorthand (`'#fff'`), RGBA syntax, and missing hash symbols.
6. **Character Sanitization**: Rejects control characters and unprintable ASCII in material names.

### Tier 3: Cross-Feature Combinations
Validates thermodynamic and mechanical relationships between properties:
1. **Moduli Elasticity Ratio ($K/E$)**:
   - In isotropic elasticity, Bulk Modulus $K$ and Young's Modulus $E$ are related via Poisson's ratio $\nu$:
     $$K = \frac{E}{3(1 - 2\nu)}$$
   - For thermodynamically stable materials ($-1 < \nu < 0.5$), $K/E > 1/9 \approx 0.111$.
   - For rigid engineering solids ($\nu \in [0.15, 0.45]$), $0.05 \le K/E \le 50.0$.
   - For nearly incompressible elastomers (vulcanized natural rubber, $\nu \to 0.499$), $K$ is $\sim 1.8 \text{ GPa}$ while $E$ is $\sim 0.003 \text{ GPa}$, yielding $K/E \approx 600$. The validator accommodates elastomers ($E < 0.05 \text{ GPa}$) up to $K/E \le 2000.0$.
2. **Yield Strain Limit ($\epsilon_y$)**:
   - Yield strain $\epsilon_y = \frac{\sigma_y (\text{MPa})}{1000 \cdot E (\text{GPa})}$.
   - For structural solids (metals, ceramics, composites, rigid polymers), Hookean elastic yield strain does not exceed 15% ($\epsilon_y \le 0.15$). Values exceeding 15% indicate an unphysical mismatch between strength and modulus.
   - For compliant biological materials and hyperelastic rubbers, the threshold expands to accommodates large-strain elasticity.
3. **Family Density Plausibility**:
   - Metals must have density $\ge 1.0 \text{ g/cm³}$ (structural engineering metals).
   - Natural woods and biomass are flagged if density exceeds $2.5 \text{ g/cm³}$.
4. **Dual-File Parity**:
   - Compares root `data.json` and static asset `public/data.json`.
   - Confirms identical record count, keys, and values so that the Next.js client and Node scripts operate on identical data.

### Tier 4: Recharts Frontend Simulation
Simulates the exact rendering pipeline of the interactive Ashby chart:
1. **Exhaustive 20 Directed Axis-Pair Simulation**:
   - For every directed pair $(X, Y)$ among `['density', 'strength', 'modulus', 'bulkModulus', 'price']`:
     - Applies the frontend filter:
       ```javascript
       const hasX = mat[xKey] !== undefined && mat[xKey] > 0;
       const hasY = mat[yKey] !== undefined && mat[yKey] > 0;
       const matchesFamily = activeFamilies.includes(mat.family);
       ```
     - Verifies that 100% of materials survive the filter.
2. **Log-Coordinate Mathematical Transformation**:
   - Simulates $\log_{10}(X)$ and $\log_{10}(Y)$ coordinate calculation for all materials across all chart axes.
   - Proves no point produces `NaN`, `null`, `Infinity`, or `-Infinity`.
3. **Family Toggle Isolation**:
   - Tests toggling each family individually to verify every family contains active, renderable scatter points.
4. **Tooltip Formatting Simulation**:
   - Formats every material record using the UI tooltip template to guarantee that string interpolation and number formatting functions execute without errors or `undefined` labels.

---

## 3. Test Runner Execution Commands

### Internal Self-Test Suite
Executes the built-in test harness verifying the validator against a 65-material reference fixture and 12 negative mutation cases:
```bash
node scripts/validate_data.js --test
```

### Default Dual-Location Validation
Validates `data.json` and `public/data.json` in the current workspace, including dual-file parity:
```bash
node scripts/validate_data.js
```

### Specific Target File Validation
Validates an arbitrary JSON file path:
```bash
node scripts/validate_data.js path/to/custom_data.json
```

### Help / Usage Information
```bash
node scripts/validate_data.js --help
```

---

## 4. Self-Test Harness Fixtures

The internal self-test suite (`--test`) executes 13 test fixtures:

| Test ID | Fixture Description | Expected Outcome | Tier Exercised |
|---|---|---|---|
| #1 | 65-material synthetic reference dataset | PASS (0 errors) | Tiers 1, 2, 3, 4 |
| #2 | Array with 49 materials ($N < 50$) | FAIL (Count out of bounds) | Tier 1 |
| #3 | Array with 76 materials ($N > 75$) | FAIL (Count out of bounds) | Tier 1 |
| #4 | Material missing required `bulkModulus` key | FAIL (Missing field) | Tier 1 |
| #5 | Material with string-encoded numeric field (`strength: "350"`) | FAIL (Type check) | Tier 1 |
| #6 | Material with null numeric field (`density: null`) | FAIL (Null check) | Tier 1 |
| #7 | Material with NaN numeric field (`modulus: NaN`) | FAIL (NaN check) | Tier 1 |
| #8 | Material with zero value (`price: 0`) | FAIL (Recharts log-scale safety) | Tier 2 |
| #9 | Material with negative value (`modulus: -20`) | FAIL (Positivity check) | Tier 2 |
| #10 | Material with invalid family enum (`family: 'Alloy'`) | FAIL (Family enum check) | Tier 1 |
| #11 | Material with invalid hex color (`color: '#FF00'`) | FAIL (Hex regex check) | Tier 2 |
| #12 | Material with duplicate name | FAIL (Uniqueness check) | Tier 1 |
| #13 | Material with extreme unphysical modulus ratio ($K/E = 0.00002$) | FAIL (Elasticity anomaly) | Tier 3 |

---

## 5. Exit Codes & CI Integration

- **Exit Code `0`**: All checks passed successfully.
- **Exit Code `1`**: One or more validation errors detected, or file read/parse error occurred.

The validation script is zero-dependency (built using standard Node.js libraries `fs` and `path`) and can be integrated directly into any pre-commit hook, GitHub Actions workflow, or build pipeline:
```bash
node scripts/validate_data.js || exit 1
```
