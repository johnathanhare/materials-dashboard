# Project: Commercial Materials Database & Dashboard

## Architecture
The materials-dashboard application is a Next.js (React 19 / Turbopack) application featuring an interactive Recharts scatter/bubble dashboard for Ashby property charts. The system architecture comprises:
1. **Static Data Store (`data.json` & `public/data.json`)**:
   - Single source of truth containing an array of 50–75 real-world engineering materials across 5 families.
   - Dual-located: at `/Users/johnathanhare/materials-dashboard/public/data.json` (for Next.js client fetching) and `/Users/johnathanhare/materials-dashboard/data.json` (for Node scripts and root imports).
2. **Methodology Documentation (`Verification_Report.md`)**:
   - Comprehensive documentation detailing the research methodology, primary reference citations (MatWeb, Cambridge Ashby database, NIST, USDA Wood Handbook, ASM International, LME), Bulk Modulus derivation standards ($K = \frac{E}{3(1-2\nu)}$), and commercial bulk pricing estimation rules.
3. **E2E Validation & Quality Gate (`scripts/validate_data.js` & tests)**:
   - Programmatic test runner executing a 4-tier validation suite (Feature coverage, Boundary & corner cases, Cross-feature interactions, Recharts simulation).
4. **Interactive UI (`app/page.tsx`)**:
   - Renders log-scale X/Y scatter plots with property selectors, family filters, and hover tooltips.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Material Catalog (65 materials) | 65 verified materials across Metals, Polymers, Ceramics, Composites, and Natural | M2 | explorer_survey_1 |
| 2 | Required Numeric Properties | Density (g/cm³), Yield Strength (strength, MPa), Young's Modulus (modulus, GPa), Bulk Modulus (bulkModulus, GPa), Price ($/kg) | M2 | ORIGINAL_REQUEST R1 |
| 3 | Visual & Categorical Fields | Name (string), Family ('Metal', 'Polymer', 'Ceramic', 'Composite', 'Natural'), Color (hex code) | M2 | spec_miner_survey_1 |
| 4 | Recharts Log-Scale Positivity | All numeric values strictly positive (> 0), no nulls, NaNs, or string numbers | M2 | spec_miner_survey_1 |
| 5 | Dual Data Locations | data.json deployed to project root and public/data.json | M2 | spec_miner_survey_1 |
| 6 | Verification Report | Verification_Report.md with >=3 primary citations, derivation details, and price methodology | M2 | explorer_survey_2 |
| 7 | Opaque-Box E2E Validation Suite | Multi-tier test suite in scripts/ validating schema, bounds, and Recharts safety | M1 | explorer_survey_2 |
| 8 | Multi-agent Gate & Forensic Audit | Passing Reviewer checks, Challenger stress tests, and Forensic Auditor verification | M3 | System Identity |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | E2E Test Suite Creation | Implement scripts/validate_data.js, configure test cases (Tiers 1-4), publish TEST_INFRA.md and TEST_READY.md | none | DONE |
| 2 | Data Compilation & Report | Author verified data.json (root + public) and Verification_Report.md | none | DONE |
| 3 | Final Milestone & Gate | Run test suite (100% pass), Reviewers, Challengers, and Forensic Auditor verification | M1, M2 | DONE |

---

## Interface Contracts
### Material Schema (`data.json`)
Each item in `data.json` MUST adhere to the following schema:
```typescript
interface Material {
  name: string;             // e.g. "Aluminum 6061-T6"
  density: number;          // g/cm³, strictly > 0
  strength: number;         // MPa, Yield strength or MOR, strictly > 0
  yieldStrength?: number;   // MPa (optional alias for strength)
  modulus: number;          // GPa, Young's Modulus, strictly > 0
  youngsModulus?: number;   // GPa (optional alias for modulus)
  bulkModulus: number;      // GPa, Bulk Modulus, strictly > 0
  price: number;            // $/kg, Commercial bulk wholesale price, strictly > 0
  family: 'Metal' | 'Polymer' | 'Ceramic' | 'Composite' | 'Natural';
  color: string;            // Valid 6-digit hex format: /^#[0-9A-Fa-f]{6}$/
}
```

### Constraints:
- Array length: Exactly 50 to 75 items (target: 65 items).
- All numeric properties MUST be finite numbers $> 0$.
- Zero strings or nulls for numeric fields.
- Family MUST match the exact 5 singular capitalized enum strings.
- Color MUST match `^#[0-9A-Fa-f]{6}$`.

---

## Code Layout
- `/Users/johnathanhare/materials-dashboard/data.json` — Root database file
- `/Users/johnathanhare/materials-dashboard/public/data.json` — Static asset for Next.js
- `/Users/johnathanhare/materials-dashboard/Verification_Report.md` — Verification report with citations
- `/Users/johnathanhare/materials-dashboard/scripts/validate_data.js` — Programmatic validation runner
- `/Users/johnathanhare/materials-dashboard/TEST_INFRA.md` — Test suite documentation
- `/Users/johnathanhare/materials-dashboard/TEST_READY.md` — Test readiness attestation
