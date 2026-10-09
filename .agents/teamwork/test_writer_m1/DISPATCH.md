# DISPATCH: E2E Test Suite Writer (test_writer_m1)

**Agent Identity**: E2E Test Suite Writer (`test_writer_m1`)
**Type**: teamwork_preview_test_writer
**Working Directory**: /Users/johnathanhare/materials-dashboard/.agents/teamwork/test_writer_m1
**Parent Conversation ID**: 25b12c54-d8ab-4169-b761-55fa46347b92

### Mandatory Reading
1. `/Users/johnathanhare/materials-dashboard/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/Users/johnathanhare/materials-dashboard/PROJECT.md`
3. `/Users/johnathanhare/materials-dashboard/.agents/teamwork/explorer_survey_2/handoff.md`

### Exclusive Write Ownership
- `/Users/johnathanhare/materials-dashboard/scripts/validate_data.js`
- `/Users/johnathanhare/materials-dashboard/TEST_INFRA.md`
- `/Users/johnathanhare/materials-dashboard/TEST_READY.md`

### Task
Design and implement the opaque-box test runner and validation suite for the materials database.
1. Create `scripts/validate_data.js` using Node.js (executable via `node scripts/validate_data.js`).
   It must programmatically validate both `/Users/johnathanhare/materials-dashboard/data.json` and `/Users/johnathanhare/materials-dashboard/public/data.json`:
   - Exact count check: $50 \le N \le 75$ materials.
   - Schema check: all required fields present (`name`, `density`, `strength`, `modulus`, `bulkModulus`, `price`, `family`, `color`).
   - Strict numeric check: every numeric field is a finite number $> 0$ (no NaN, null, string numbers, or $\le 0$ to prevent Recharts log scale crashes).
   - Family enum check: strictly one of `'Metal'`, `'Polymer'`, `'Ceramic'`, `'Composite'`, `'Natural'`.
   - Color check: regex match `^#[0-9A-Fa-f]{6}$`.
   - Physical plausibility checks: density within physical bounds, moduli positive and physically reasonable.
2. Structure the test suite across 4 tiers:
   - Tier 1: Feature Coverage (checks for all required fields, count, and types)
   - Tier 2: Boundary & Corner Cases (log-scale values, extremes, Recharts axis limits)
   - Tier 3: Cross-Feature Combinations (family vs color matching, density vs bulk modulus bounds, strength vs modulus ratios)
   - Tier 4: Real-World Application Scenarios (Recharts simulated frontend render, Ashby chart scatter points, data integrity checks)
3. Write `TEST_INFRA.md` documenting test architecture, runner command, and tier definitions.
4. When validation script and test structure are ready, publish `TEST_READY.md`.

### Deliverables
- `scripts/validate_data.js`
- `TEST_INFRA.md`
- `TEST_READY.md`
- Handoff report in `/Users/johnathanhare/materials-dashboard/.agents/teamwork/test_writer_m1/handoff.md`.


## 2026-10-08T20:49:48Z
You are the E2E Test Suite Writer (test_writer_m1).
Your working directory is /Users/johnathanhare/materials-dashboard/.agents/teamwork/test_writer_m1.
Read /Users/johnathanhare/materials-dashboard/.agents/teamwork/ORIGINAL_REQUEST.md, /Users/johnathanhare/materials-dashboard/PROJECT.md, and /Users/johnathanhare/materials-dashboard/.agents/teamwork/test_writer_m1/DISPATCH.md before starting.
Your task:
1. Write /Users/johnathanhare/materials-dashboard/scripts/validate_data.js to strictly and programmatically validate both /Users/johnathanhare/materials-dashboard/data.json and /Users/johnathanhare/materials-dashboard/public/data.json across 4 tiers (Feature coverage, Boundary & corner cases, Cross-feature interactions, Recharts frontend simulation).
2. Write /Users/johnathanhare/materials-dashboard/TEST_INFRA.md documenting the test architecture and runner.
3. Write /Users/johnathanhare/materials-dashboard/TEST_READY.md when test infrastructure is ready.
4. Run your test runner to verify test execution.
5. Write your handoff report to /Users/johnathanhare/materials-dashboard/.agents/teamwork/test_writer_m1/handoff.md and notify the parent orchestrator (conversation ID: 25b12c54-d8ab-4169-b761-55fa46347b92) via send_message.
