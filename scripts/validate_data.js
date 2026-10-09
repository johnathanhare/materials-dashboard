#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * ============================================================================
 * MATERIALS DATABASE E2E TEST RUNNER & VALIDATION SUITE
 * ============================================================================
 * 
 * Multi-Tier Programmatic Validator for Commercial Materials Database:
 *   - /Users/johnathanhare/materials-dashboard/data.json
 *   - /Users/johnathanhare/materials-dashboard/public/data.json
 * 
 * Tiers:
 *   - Tier 1: Feature Coverage (Schema completeness, record count 50-75, types, enum constraints)
 *   - Tier 2: Boundary & Corner Cases (Strict positivity > 0, Recharts log scale safety, hex color regex, physical boundaries)
 *   - Tier 3: Cross-Feature Combinations (Elasticity K/E modulus ratios, yield strain limits, density plausibility, dual-file parity)
 *   - Tier 4: Real-World Application Scenarios (Recharts scatter plot coordinate simulation, logarithmic math stability, family filtering)
 * 
 * Usage:
 *   node scripts/validate_data.js               # Validates default data.json and public/data.json
 *   node scripts/validate_data.js <file_path>   # Validates a specific JSON dataset
 *   node scripts/validate_data.js --test        # Executes internal test suite (positive + 12 negative fixtures)
 *   node scripts/validate_data.js --help        # Displays usage and tier breakdown
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const COUNT_MIN = 50;
const COUNT_MAX = 75;

const VALID_FAMILIES = new Set(['Metal', 'Polymer', 'Ceramic', 'Composite', 'Natural']);

const REQUIRED_NUMERIC_PROPERTIES = [
  'density',     // g/cm³
  'strength',    // MPa
  'modulus',     // GPa
  'bulkModulus', // GPa
  'price'        // $/kg
];

const ALL_REQUIRED_PROPERTIES = [
  'name',
  'density',
  'strength',
  'modulus',
  'bulkModulus',
  'price',
  'family',
  'color'
];

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

const PHYSICAL_BOUNDS = {
  density: { min: 0.05, max: 25.0, unit: 'g/cm³' },
  strength: { min: 1.0, max: 10000.0, unit: 'MPa' },
  modulus: { min: 0.001, max: 1500.0, unit: 'GPa' },
  bulkModulus: { min: 0.001, max: 1000.0, unit: 'GPa' },
  price: { min: 0.01, max: 10000.0, unit: '$/kg' }
};

// Family UI color standard defined in app/page.tsx line 43
const FAMILY_COLORS = {
  'Metal': '#ef4444',
  'Polymer': '#3b82f6',
  'Composite': '#10b981',
  'Ceramic': '#f59e0b',
  'Natural': '#8b5cf6'
};

// ============================================================================
// VALIDATION SUITE ENGINE
// ============================================================================

/**
 * Validates a dataset across all 4 tiers.
 * @param {Array<object>} data - Parsed array of material objects
 * @param {object} options - Options { verbose: boolean }
 * @returns {object} Validation result object
 */
function validateDataset(data, options = {}) {
  const isVerbose = Boolean(options && options.verbose);
  const results = {
    tier1: { name: 'Tier 1: Feature Coverage', passed: true, errors: [], checks: 0 },
    tier2: { name: 'Tier 2: Boundary & Corner Cases', passed: true, errors: [], checks: 0 },
    tier3: { name: 'Tier 3: Cross-Feature Combinations', passed: true, errors: [], warnings: [], checks: 0 },
    tier4: { name: 'Tier 4: Recharts Simulation', passed: true, errors: [], checks: 0 },
  };

  const allErrors = [];
  const allWarnings = [];

  // Helper to record error in tier
  function addError(tierKey, msg) {
    results[tierKey].errors.push(msg);
    results[tierKey].passed = false;
    allErrors.push(`[${results[tierKey].name}] ${msg}`);
  }

  function addWarning(tierKey, msg) {
    if (results[tierKey].warnings) {
      results[tierKey].warnings.push(msg);
    }
    allWarnings.push(`[${results[tierKey].name}] ${msg}`);
  }

  // Basic structure check
  if (!Array.isArray(data)) {
    addError('tier1', `Root data structure must be an Array. Received: ${typeof data}`);
    return {
      passed: false,
      tierResults: results,
      errors: allErrors,
      warnings: allWarnings,
      totalChecks: 1
    };
  }

  // --------------------------------------------------------------------------
  // TIER 1: FEATURE COVERAGE
  // --------------------------------------------------------------------------
  results.tier1.checks++;
  const count = data.length;
  if (count < COUNT_MIN || count > COUNT_MAX) {
    addError('tier1', `Material count out of bounds. Expected ${COUNT_MIN} <= N <= ${COUNT_MAX}, but received: ${count}`);
  }

  const seenNames = new Set();
  const seenFamilies = new Set();

  data.forEach((mat, idx) => {
    results.tier1.checks++;
    const loc = `Material #${idx + 1} (${mat && mat.name ? `"${mat.name}"` : 'Unknown'})`;

    if (!mat || typeof mat !== 'object') {
      addError('tier1', `${loc}: Item is not an object.`);
      return;
    }

    // Required fields presence
    for (const prop of ALL_REQUIRED_PROPERTIES) {
      results.tier1.checks++;
      if (!(prop in mat)) {
        addError('tier1', `${loc}: Missing required field '${prop}'.`);
      }
    }

    // Name check
    results.tier1.checks++;
    if (typeof mat.name !== 'string' || !mat.name.trim()) {
      addError('tier1', `${loc}: 'name' must be a non-empty string.`);
    } else {
      const normalizedName = mat.name.trim().toLowerCase();
      if (seenNames.has(normalizedName)) {
        addError('tier1', `${loc}: Duplicate material name detected: "${mat.name.trim()}".`);
      }
      seenNames.add(normalizedName);
    }

    // Family enum check
    results.tier1.checks++;
    if (typeof mat.family !== 'string' || !VALID_FAMILIES.has(mat.family)) {
      addError('tier1', `${loc}: 'family' must be one of [${Array.from(VALID_FAMILIES).join(', ')}]. Received: ${JSON.stringify(mat.family)}`);
    } else {
      seenFamilies.add(mat.family);
    }

    // Numeric field type checks
    for (const numProp of REQUIRED_NUMERIC_PROPERTIES) {
      results.tier1.checks++;
      const val = mat[numProp];
      if (val === null || val === undefined) {
        addError('tier1', `${loc}: Numeric property '${numProp}' cannot be null or undefined.`);
      } else if (typeof val !== 'number') {
        addError('tier1', `${loc}: Property '${numProp}' must be typeof 'number'. Found: ${typeof val} (${JSON.stringify(val)})`);
      } else if (Number.isNaN(val)) {
        addError('tier1', `${loc}: Property '${numProp}' cannot be NaN.`);
      } else if (!Number.isFinite(val)) {
        addError('tier1', `${loc}: Property '${numProp}' must be finite.`);
      }
    }
  });

  // Verify all 5 families are represented in catalog
  results.tier1.checks++;
  for (const fam of VALID_FAMILIES) {
    if (!seenFamilies.has(fam)) {
      addError('tier1', `Catalog is missing representative materials for family: '${fam}'. All 5 families must be present.`);
    }
  }

  // --------------------------------------------------------------------------
  // TIER 2: BOUNDARY & CORNER CASES (Log-scale safety, hex colors, bounds)
  // --------------------------------------------------------------------------
  data.forEach((mat, idx) => {
    if (!mat || typeof mat !== 'object') return;
    const loc = `Material #${idx + 1} (${mat.name || 'Unknown'})`;

    // Hex Color Regex check
    results.tier2.checks++;
    if (typeof mat.color !== 'string' || !HEX_COLOR_REGEX.test(mat.color)) {
      addError('tier2', `${loc}: 'color' must match valid 6-digit hex format /^#[0-9A-Fa-f]{6}$/. Received: ${JSON.stringify(mat.color)}`);
    }

    // Name cleanliness
    results.tier2.checks++;
    if (typeof mat.name === 'string' && /[\u0000-\u001F\u007F]/.test(mat.name)) {
      addError('tier2', `${loc}: 'name' contains illegal control characters.`);
    }

    // Numeric Log-Scale Positivity Check (Strictly > 0)
    for (const numProp of REQUIRED_NUMERIC_PROPERTIES) {
      results.tier2.checks++;
      const val = mat[numProp];
      if (typeof val === 'number' && Number.isFinite(val)) {
        if (val <= 0) {
          addError('tier2', `${loc}: CRITICAL RECHARTS SAFETY VIOLATION: '${numProp}' must be strictly > 0 (val=${val}). Non-positive values cause Recharts log scale crashes.`);
        }

        // Subnormal number check (< 1e-10)
        if (val > 0 && val < 1e-6) {
          addError('tier2', `${loc}: Property '${numProp}' is near-zero subnormal (${val}), which distorts log scaling.`);
        }

        // Physical bounds checking
        const bounds = PHYSICAL_BOUNDS[numProp];
        if (bounds) {
          results.tier2.checks++;
          if (val < bounds.min || val > bounds.max) {
            addError('tier2', `${loc}: Physical boundary violation for '${numProp}': ${val} ${bounds.unit} is outside reasonable physical range [${bounds.min}, ${bounds.max}].`);
          }
        }
      }
    }
  });

  // Recharts Axis Domain simulation (simulating app/page.tsx lines 280-294)
  if (data.length > 0) {
    for (const prop of REQUIRED_NUMERIC_PROPERTIES) {
      results.tier2.checks++;
      const values = data.map(m => m && typeof m[prop] === 'number' ? m[prop] : null).filter(v => v !== null && v > 0);
      if (values.length === data.length) {
        const dataMin = Math.min(...values);
        const dataMax = Math.max(...values);
        const domainMin = Math.max(0.001, dataMin * 0.5);
        const domainMax = dataMax * 1.5;

        if (!Number.isFinite(domainMin) || domainMin <= 0) {
          addError('tier2', `Recharts domain calculation failed for '${prop}': calculated domainMin (${domainMin}) is invalid.`);
        }
        if (!Number.isFinite(domainMax) || domainMax <= domainMin) {
          addError('tier2', `Recharts domain calculation failed for '${prop}': calculated domainMax (${domainMax}) is <= domainMin.`);
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // TIER 3: CROSS-FEATURE INTERACTIONS (Moduli ratios, yield strain, density)
  // --------------------------------------------------------------------------
  data.forEach((mat, idx) => {
    if (!mat || typeof mat !== 'object') return;
    const loc = `Material #${idx + 1} (${mat.name || 'Unknown'})`;

    const E = mat.modulus;
    const K = mat.bulkModulus;
    const sigmaY = mat.strength;
    const rho = mat.density;

    if (typeof E === 'number' && typeof K === 'number' && E > 0 && K > 0) {
      results.tier3.checks++;
      // In isotropic elasticity, K = E / (3*(1 - 2*nu)).
      // For thermodynamically stable materials (-1 < nu < 0.5), K/E > 1/9 (approx 0.111).
      // For rigid solids (metals, ceramics, rigid polymers, composites, woods), nu is in [0.15, 0.45], so K/E is in [0.05, 50].
      // For nearly-incompressible elastomers (rubbers, soft tissues, nu -> 0.499), K is order ~1-2 GPa while E is order ~0.001-0.01 GPa,
      // resulting in K/E ratios between 100 and 1500.
      const ratio = K / E;
      const isElastomerOrSoft = E < 0.05 || (mat.family === 'Natural' && mat.name && mat.name.toLowerCase().includes('rubber'));
      const maxAllowedRatio = isElastomerOrSoft ? 2000.0 : 50.0;

      if (ratio < 0.05 || ratio > maxAllowedRatio) {
        addError('tier3', `${loc}: Elasticity anomaly: Bulk Modulus / Young's Modulus ratio K/E = ${ratio.toFixed(3)} is unphysical (expected 0.05 <= K/E <= ${maxAllowedRatio}; K=${K} GPa, E=${E} GPa).`);
      }
    }

    // Yield strain check: sigmaY (MPa) / E (GPa)
    // Yield strain epsilon_y = (sigmaY * 1e6) / (E * 1e9) = sigmaY / (1000 * E)
    if (typeof sigmaY === 'number' && typeof E === 'number' && sigmaY > 0 && E > 0) {
      results.tier3.checks++;
      const yieldStrain = sigmaY / (1000.0 * E);
      // For structural solids (metals, ceramics, composites, rigid polymers), Hookean yield strain rarely exceeds 0.15 (15%).
      // For compliant biological tissues (leather) and hyperelastic elastomers (rubber), elongation at failure can reach 50% to 800% (0.5 to 8.0).
      const isCompliantOrBio = E < 0.2 || mat.family === 'Natural';
      const maxYieldStrain = isCompliantOrBio ? 10.0 : 0.15;

      if (yieldStrain > maxYieldStrain) {
        addError('tier3', `${loc}: Yield strain anomaly: epsilon_y = ${yieldStrain.toFixed(4)} exceeds ${maxYieldStrain * 100}% limit (strength=${sigmaY} MPa, modulus=${E} GPa).`);
      }
    }

    // Family palette alignment check
    if (typeof mat.color === 'string' && typeof mat.family === 'string' && FAMILY_COLORS[mat.family]) {
      results.tier3.checks++;
      if (mat.color.toLowerCase() !== FAMILY_COLORS[mat.family].toLowerCase()) {
        addWarning('tier3', `${loc}: Color '${mat.color}' differs from standard ${mat.family} palette '${FAMILY_COLORS[mat.family]}'.`);
      }
    }

    // Density cross-checks by family
    if (typeof rho === 'number' && typeof mat.family === 'string') {
      results.tier3.checks++;
      if (mat.family === 'Natural' && rho > 2.5) {
        addWarning('tier3', `${loc}: Natural material density (${rho} g/cm³) is unusually high for timber or biomass.`);
      }
      if (mat.family === 'Metal' && rho < 1.0) {
        addError('tier3', `${loc}: Metallic material density (${rho} g/cm³) is below 1.0 g/cm³, which is impossible for commercial structural metals.`);
      }
    }
  });

  // --------------------------------------------------------------------------
  // TIER 4: RECHARTS FRONTEND SIMULATION (Scatter coordinate transform & filtering)
  // --------------------------------------------------------------------------
  // Simulate the exact frontend data pipeline in app/page.tsx:
  // For all pairs of axes, test filtering and log-coordinate transformation.
  const axisKeys = REQUIRED_NUMERIC_PROPERTIES;
  const familiesList = Array.from(VALID_FAMILIES);

  for (let i = 0; i < axisKeys.length; i++) {
    for (let j = 0; j < axisKeys.length; j++) {
      if (i === j) continue;
      const xKey = axisKeys[i];
      const yKey = axisKeys[j];
      results.tier4.checks++;

      // Simulate filter from app/page.tsx line 83-89
      const filtered = data.filter(mat => {
        const hasX = mat && mat[xKey] !== undefined && mat[xKey] > 0;
        const hasY = mat && mat[yKey] !== undefined && mat[yKey] > 0;
        const matchesFamily = mat && familiesList.includes(mat.family);
        return hasX && hasY && matchesFamily;
      });

      if (filtered.length !== data.length) {
        addError('tier4', `Recharts chart filter dropped ${data.length - filtered.length} materials on axis pair (${xKey}, ${yKey}). All materials must be renderable.`);
      }

      // Simulate logarithmic coordinate calculation (log10 projection)
      for (const mat of filtered) {
        results.tier4.checks++;
        const xVal = mat[xKey];
        const yVal = mat[yKey];
        const logX = Math.log10(xVal);
        const logY = Math.log10(yVal);

        if (!Number.isFinite(logX) || Number.isNaN(logX)) {
          addError('tier4', `Scatter simulation failed: log10(${xKey}=${xVal}) produced invalid coordinate (${logX}) for "${mat.name}".`);
        }
        if (!Number.isFinite(logY) || Number.isNaN(logY)) {
          addError('tier4', `Scatter simulation failed: log10(${yKey}=${yVal}) produced invalid coordinate (${logY}) for "${mat.name}".`);
        }
      }
    }
  }

  // Family toggle isolation test: toggling each family yields non-empty subset
  for (const fam of familiesList) {
    results.tier4.checks++;
    const famSet = data.filter(m => m && m.family === fam);
    if (famSet.length === 0) {
      addError('tier4', `Recharts UI filter test: family toggle for '${fam}' has 0 active points.`);
    }
  }

  // Tooltip formatter simulation: ensures all properties can be formatted for UI tooltip
  data.forEach((mat, idx) => {
    results.tier4.checks++;
    const loc = `Material #${idx + 1} (${mat.name || 'Unknown'})`;
    try {
      const tooltipString = `${mat.name} (${mat.family}): Density ${mat.density.toFixed(2)} g/cm³, Yield ${mat.strength.toFixed(1)} MPa, Modulus ${mat.modulus.toFixed(1)} GPa, Bulk Modulus ${mat.bulkModulus.toFixed(1)} GPa, Price $${mat.price.toFixed(2)}/kg`;
      if (!tooltipString || tooltipString.includes('undefined') || tooltipString.includes('NaN')) {
        addError('tier4', `${loc}: Tooltip formatting produced corrupted string: "${tooltipString}"`);
      }
    } catch (err) {
      addError('tier4', `${loc}: Tooltip simulation threw error: ${err.message}`);
    }
  });

  const passed = results.tier1.passed && results.tier2.passed && results.tier3.passed && results.tier4.passed;
  const totalChecks = results.tier1.checks + results.tier2.checks + results.tier3.checks + results.tier4.checks;

  if (isVerbose) {
    console.log(`[VERBOSE] Dataset validation completed ${totalChecks} checks across 4 tiers. Status: ${passed ? 'PASSED' : 'FAILED'}`);
  }

  return {
    passed,
    tierResults: results,
    errors: allErrors,
    warnings: allWarnings,
    totalChecks
  };
}

/**
 * Validates dual-file parity between two file paths.
 */
function validateParity(path1, path2) {
  const result = { passed: true, errors: [] };
  if (!fs.existsSync(path1) || !fs.existsSync(path2)) {
    return result; // Skip if one is not present
  }

  try {
    const content1 = fs.readFileSync(path1, 'utf8').trim();
    const content2 = fs.readFileSync(path2, 'utf8').trim();

    const data1 = JSON.parse(content1);
    const data2 = JSON.parse(content2);

    if (data1.length !== data2.length) {
      result.passed = false;
      result.errors.push(`Parity mismatch: ${path1} has ${data1.length} items, but ${path2} has ${data2.length} items.`);
      return result;
    }

    // Compare serialized normalized JSON
    const norm1 = JSON.stringify(data1);
    const norm2 = JSON.stringify(data2);
    if (norm1 !== norm2) {
      result.passed = false;
      result.errors.push(`Parity mismatch: Semantic content of ${path1} and ${path2} differs.`);
    }
  } catch (err) {
    result.passed = false;
    result.errors.push(`Parity comparison failed: ${err.message}`);
  }

  return result;
}

// ============================================================================
// SELF-TEST HARNESS (--test)
// ============================================================================

/**
 * Generates a valid sample dataset with 65 materials matching real-world specs.
 */
function createSyntheticValidDataset() {
  const baseMaterials = [
    // Metals (15)
    { name: 'Steel (AISI 1020)', density: 7.85, strength: 350, modulus: 200, bulkModulus: 140, price: 0.85, family: 'Metal', color: '#ef4444' },
    { name: 'Steel (AISI 4140 Quenched)', density: 7.85, strength: 950, modulus: 210, bulkModulus: 160, price: 1.65, family: 'Metal', color: '#ef4444' },
    { name: 'Stainless Steel (AISI 304)', density: 8.00, strength: 290, modulus: 193, bulkModulus: 150, price: 3.20, family: 'Metal', color: '#ef4444' },
    { name: 'Stainless Steel (AISI 316L)', density: 8.00, strength: 290, modulus: 193, bulkModulus: 155, price: 4.10, family: 'Metal', color: '#ef4444' },
    { name: 'Aluminum (6061-T6)', density: 2.70, strength: 276, modulus: 68.9, bulkModulus: 67.5, price: 2.85, family: 'Metal', color: '#ef4444' },
    { name: 'Aluminum (7075-T6)', density: 2.81, strength: 503, modulus: 71.7, bulkModulus: 70.3, price: 4.50, family: 'Metal', color: '#ef4444' },
    { name: 'Titanium (Ti-6Al-4V Gr 5)', density: 4.43, strength: 880, modulus: 113.8, bulkModulus: 120, price: 28.00, family: 'Metal', color: '#ef4444' },
    { name: 'Copper (C11000 ETP)', density: 8.94, strength: 195, modulus: 117, bulkModulus: 130, price: 9.80, family: 'Metal', color: '#ef4444' },
    { name: 'Brass (C36000 Free-Cutting)', density: 8.50, strength: 310, modulus: 97, bulkModulus: 105, price: 7.50, family: 'Metal', color: '#ef4444' },
    { name: 'Magnesium Alloy (AZ31B)', density: 1.77, strength: 200, modulus: 45, bulkModulus: 45, price: 4.20, family: 'Metal', color: '#ef4444' },
    { name: 'Nickel Superalloy (Inconel 718)', density: 8.19, strength: 1100, modulus: 205, bulkModulus: 165, price: 45.00, family: 'Metal', color: '#ef4444' },
    { name: 'Bronze (C93200 Bearing)', density: 8.90, strength: 240, modulus: 100, bulkModulus: 110, price: 11.50, family: 'Metal', color: '#ef4444' },
    { name: 'Cast Iron (Ductile 65-45-12)', density: 7.10, strength: 310, modulus: 168, bulkModulus: 120, price: 1.20, family: 'Metal', color: '#ef4444' },
    { name: 'Tool Steel (AISI D2)', density: 7.70, strength: 1600, modulus: 210, bulkModulus: 160, price: 5.50, family: 'Metal', color: '#ef4444' },
    { name: 'Zinc Casting Alloy (Zamak 3)', density: 6.60, strength: 280, modulus: 85, bulkModulus: 70, price: 3.40, family: 'Metal', color: '#ef4444' },

    // Polymers (15)
    { name: 'Polyethylene (HDPE)', density: 0.95, strength: 28, modulus: 1.1, bulkModulus: 2.2, price: 1.45, family: 'Polymer', color: '#3b82f6' },
    { name: 'Polyethylene (LDPE)', density: 0.92, strength: 12, modulus: 0.25, bulkModulus: 1.5, price: 1.35, family: 'Polymer', color: '#3b82f6' },
    { name: 'Polypropylene (PP Homopolymer)', density: 0.90, strength: 35, modulus: 1.5, bulkModulus: 2.5, price: 1.40, family: 'Polymer', color: '#3b82f6' },
    { name: 'Polycarbonate (PC Lexan)', density: 1.20, strength: 65, modulus: 2.4, bulkModulus: 3.8, price: 3.50, family: 'Polymer', color: '#3b82f6' },
    { name: 'Nylon 6/6 (Polyamide 66)', density: 1.14, strength: 82, modulus: 2.8, bulkModulus: 4.2, price: 4.20, family: 'Polymer', color: '#3b82f6' },
    { name: 'Polyvinyl Chloride (PVC Rigid)', density: 1.40, strength: 52, modulus: 3.1, bulkModulus: 3.5, price: 1.30, family: 'Polymer', color: '#3b82f6' },
    { name: 'Polytetrafluoroethylene (PTFE Teflon)', density: 2.16, strength: 25, modulus: 0.5, bulkModulus: 2.1, price: 16.00, family: 'Polymer', color: '#3b82f6' },
    { name: 'Acrylonitrile Butadiene Styrene (ABS)', density: 1.05, strength: 45, modulus: 2.3, bulkModulus: 2.9, price: 2.30, family: 'Polymer', color: '#3b82f6' },
    { name: 'Polyoxymethylene (POM Acetal Delrin)', density: 1.41, strength: 70, modulus: 3.1, bulkModulus: 3.6, price: 3.80, family: 'Polymer', color: '#3b82f6' },
    { name: 'Polyethylene Terephthalate (PET)', density: 1.37, strength: 60, modulus: 3.0, bulkModulus: 3.8, price: 1.60, family: 'Polymer', color: '#3b82f6' },
    { name: 'Polymethyl Methacrylate (PMMA Acrylic)', density: 1.18, strength: 72, modulus: 3.3, bulkModulus: 4.0, price: 2.80, family: 'Polymer', color: '#3b82f6' },
    { name: 'Polystyrene (General Purpose GPPS)', density: 1.04, strength: 40, modulus: 3.2, bulkModulus: 3.6, price: 1.50, family: 'Polymer', color: '#3b82f6' },
    { name: 'Polyetheretherketone (PEEK)', density: 1.30, strength: 100, modulus: 3.8, bulkModulus: 4.5, price: 85.00, family: 'Polymer', color: '#3b82f6' },
    { name: 'Epoxy Resin (Bisphenol-A Cast)', density: 1.25, strength: 65, modulus: 3.5, bulkModulus: 4.1, price: 5.50, family: 'Polymer', color: '#3b82f6' },
    { name: 'Polyurethane (Rigid PUR)', density: 1.15, strength: 55, modulus: 2.0, bulkModulus: 2.8, price: 4.00, family: 'Polymer', color: '#3b82f6' },

    // Ceramics (12)
    { name: 'Alumina (Al2O3 99.5%)', density: 3.90, strength: 350, modulus: 380, bulkModulus: 240, price: 18.00, family: 'Ceramic', color: '#f59e0b' },
    { name: 'Silicon Carbide (Sintered SiC)', density: 3.15, strength: 420, modulus: 410, bulkModulus: 220, price: 32.00, family: 'Ceramic', color: '#f59e0b' },
    { name: 'Silicon Nitride (Si3N4)', density: 3.25, strength: 750, modulus: 310, bulkModulus: 210, price: 55.00, family: 'Ceramic', color: '#f59e0b' },
    { name: 'Zirconia (Y-TZP)', density: 6.05, strength: 1200, modulus: 210, bulkModulus: 180, price: 65.00, family: 'Ceramic', color: '#f59e0b' },
    { name: 'Boron Carbide (B4C)', density: 2.52, strength: 450, modulus: 450, bulkModulus: 200, price: 75.00, family: 'Ceramic', color: '#f59e0b' },
    { name: 'Tungsten Carbide (WC-6%Co)', density: 14.90, strength: 2200, modulus: 630, bulkModulus: 380, price: 60.00, family: 'Ceramic', color: '#f59e0b' },
    { name: 'Soda-Lime Float Glass', density: 2.50, strength: 50, modulus: 72, bulkModulus: 43, price: 1.20, family: 'Ceramic', color: '#f59e0b' },
    { name: 'Borosilicate Glass (Pyrex)', density: 2.23, strength: 45, modulus: 64, bulkModulus: 38, price: 3.50, family: 'Ceramic', color: '#f59e0b' },
    { name: 'Fused Silica (Quartz SiO2)', density: 2.20, strength: 60, modulus: 73, bulkModulus: 37, price: 25.00, family: 'Ceramic', color: '#f59e0b' },
    { name: 'Aluminum Nitride (AlN)', density: 3.26, strength: 320, modulus: 310, bulkModulus: 200, price: 45.00, family: 'Ceramic', color: '#f59e0b' },
    { name: 'Structural Concrete (Standard)', density: 2.40, strength: 35, modulus: 30, bulkModulus: 18, price: 0.12, family: 'Ceramic', color: '#f59e0b' },
    { name: 'Clay Brick (Fired Structural)', density: 1.90, strength: 25, modulus: 15, bulkModulus: 9, price: 0.25, family: 'Ceramic', color: '#f59e0b' },

    // Composites (12)
    { name: 'CFRP (Unidirectional Carbon/Epoxy)', density: 1.55, strength: 1500, modulus: 140, bulkModulus: 18, price: 38.00, family: 'Composite', color: '#10b981' },
    { name: 'CFRP (Woven Fabric Carbon/Epoxy)', density: 1.50, strength: 750, modulus: 70, bulkModulus: 15, price: 42.00, family: 'Composite', color: '#10b981' },
    { name: 'GFRP (Pultruded E-Glass/Polyester)', density: 1.85, strength: 380, modulus: 28, bulkModulus: 12, price: 4.80, family: 'Composite', color: '#10b981' },
    { name: 'GFRP (E-Glass/Epoxy Laminate)', density: 1.95, strength: 520, modulus: 35, bulkModulus: 14, price: 8.50, family: 'Composite', color: '#10b981' },
    { name: 'Aramid Composite (Kevlar 49/Epoxy)', density: 1.40, strength: 1250, modulus: 76, bulkModulus: 11, price: 35.00, family: 'Composite', color: '#10b981' },
    { name: 'Sheet Molding Compound (SMC 30% Glass)', density: 1.80, strength: 110, modulus: 12, bulkModulus: 9, price: 3.20, family: 'Composite', color: '#10b981' },
    { name: 'Bulk Molding Compound (BMC Glass/Polyester)', density: 1.90, strength: 65, modulus: 11, bulkModulus: 8.5, price: 2.80, family: 'Composite', color: '#10b981' },
    { name: 'Glass-Filled Nylon (PA66-GF30)', density: 1.37, strength: 175, modulus: 9.5, bulkModulus: 7.2, price: 5.20, family: 'Composite', color: '#10b981' },
    { name: 'Carbon-Filled PEEK (PEEK-CF30)', density: 1.44, strength: 220, modulus: 24, bulkModulus: 12, price: 110.00, family: 'Composite', color: '#10b981' },
    { name: 'Bimetallic Strip (Invar/Brass)', density: 8.30, strength: 420, modulus: 130, bulkModulus: 115, price: 14.00, family: 'Composite', color: '#10b981' },
    { name: 'Metal Matrix Composite (Al-20%SiCp)', density: 2.80, strength: 480, modulus: 105, bulkModulus: 85, price: 22.00, family: 'Composite', color: '#10b981' },
    { name: 'Wood-Plastic Composite (WPE Decking)', density: 1.15, strength: 30, modulus: 4.5, bulkModulus: 3.2, price: 2.10, family: 'Composite', color: '#10b981' },

    // Natural Materials (11)
    { name: 'Oak (White, Quercus alba, 12% MC)', density: 0.75, strength: 51, modulus: 12.3, bulkModulus: 1.6, price: 1.80, family: 'Natural', color: '#8b5cf6' },
    { name: 'Pine (Scots / Radiata, 12% MC)', density: 0.51, strength: 42, modulus: 10.1, bulkModulus: 1.1, price: 0.75, family: 'Natural', color: '#8b5cf6' },
    { name: 'Maple (Hard / Sugar, 12% MC)', density: 0.71, strength: 54, modulus: 12.6, bulkModulus: 1.5, price: 2.20, family: 'Natural', color: '#8b5cf6' },
    { name: 'Douglas Fir (Pseudotsuga menziesii, 12% MC)', density: 0.53, strength: 50, modulus: 13.4, bulkModulus: 1.2, price: 0.90, family: 'Natural', color: '#8b5cf6' },
    { name: 'Walnut (Black, Juglans nigra, 12% MC)', density: 0.64, strength: 52, modulus: 11.6, bulkModulus: 1.4, price: 4.50, family: 'Natural', color: '#8b5cf6' },
    { name: 'Teak (Tectona grandis, 12% MC)', density: 0.66, strength: 58, modulus: 11.2, bulkModulus: 1.5, price: 8.50, family: 'Natural', color: '#8b5cf6' },
    { name: 'Balsa Wood (Ochroma pyramidale, 12% MC)', density: 0.16, strength: 15, modulus: 3.4, bulkModulus: 0.35, price: 9.00, family: 'Natural', color: '#8b5cf6' },
    { name: 'Bamboo (Moso Timber Culm, Parallel)', density: 0.68, strength: 65, modulus: 18.0, bulkModulus: 2.2, price: 1.20, family: 'Natural', color: '#8b5cf6' },
    { name: 'Cork (Quercus suber Natural)', density: 0.18, strength: 1.8, modulus: 0.03, bulkModulus: 0.04, price: 6.50, family: 'Natural', color: '#8b5cf6' },
    { name: 'Natural Rubber (Vulcanized Hevea)', density: 0.95, strength: 22, modulus: 0.003, bulkModulus: 1.8, price: 2.40, family: 'Natural', color: '#8b5cf6' },
    { name: 'Leather (Full-Grain Vegetable Tanned)', density: 0.85, strength: 25, modulus: 0.12, bulkModulus: 0.6, price: 18.00, family: 'Natural', color: '#8b5cf6' }
  ];

  return baseMaterials; // Exactly 65 items (15 + 15 + 12 + 12 + 11 = 65)
}

/**
 * Runs the self-test suite exercising valid dataset and 12 negative test mutations.
 */
function runSelfTestSuite() {
  console.log(`======================================================================`);
  console.log(`  RUNNING INTERNAL VALIDATION SELF-TEST SUITE (--test)`);
  console.log(`======================================================================\n`);

  const startTime = Date.now();
  let passedTests = 0;
  let totalTests = 0;

  function assertTest(testName, condition, detail = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] Test #${totalTests}: ${testName}`);
    } else {
      console.error(`  [FAIL] Test #${totalTests}: ${testName}`);
      if (detail) console.error(`         Detail: ${detail}`);
    }
  }

  // 1. Positive Reference Test: Baseline 65-item dataset
  const baseline = createSyntheticValidDataset();
  const baselineResult = validateDataset(baseline);
  assertTest(
    'Baseline 65-material dataset passes all 4 tiers with zero errors',
    baselineResult.passed === true && baselineResult.errors.length === 0,
    `Errors reported: ${baselineResult.errors.join('; ')}`
  );

  // 2. Negative Fixture 1: Count < 50 items (49 items)
  const tooFew = baseline.slice(0, 49);
  const tooFewRes = validateDataset(tooFew);
  assertTest(
    'Negative Case 1: Count < 50 items triggers Tier 1 count failure',
    tooFewRes.passed === false && tooFewRes.tierResults.tier1.passed === false && tooFewRes.errors.some(e => e.includes('Material count out of bounds')),
    `Errors: ${tooFewRes.errors.join('; ')}`
  );

  // 3. Negative Fixture 2: Count > 75 items (76 items)
  const tooMany = [...baseline, ...baseline.slice(0, 11).map((m, i) => ({ ...m, name: `Extra Alloy #${i}` }))];
  const tooManyRes = validateDataset(tooMany);
  assertTest(
    'Negative Case 2: Count > 75 items triggers Tier 1 count failure',
    tooManyRes.passed === false && tooManyRes.tierResults.tier1.passed === false && tooManyRes.errors.some(e => e.includes('Material count out of bounds')),
    `Errors: ${tooManyRes.errors.join('; ')}`
  );

  // 4. Negative Fixture 3: Missing required property ('bulkModulus' omitted)
  const missingProp = baseline.map((m, i) => {
    if (i === 5) {
      const copy = { ...m };
      delete copy.bulkModulus;
      return copy;
    }
    return m;
  });
  const missingPropRes = validateDataset(missingProp);
  assertTest(
    'Negative Case 3: Missing field "bulkModulus" triggers Tier 1 schema failure',
    missingPropRes.passed === false && missingPropRes.tierResults.tier1.passed === false && missingPropRes.errors.some(e => e.includes("Missing required field 'bulkModulus'")),
    `Errors: ${missingPropRes.errors.join('; ')}`
  );

  // 5. Negative Fixture 4: String-encoded numeric property (strength: "350")
  const stringProp = baseline.map((m, i) => (i === 3 ? { ...m, strength: '350' } : m));
  const stringPropRes = validateDataset(stringProp);
  assertTest(
    'Negative Case 4: String-encoded numeric property triggers Tier 1 type failure',
    stringPropRes.passed === false && stringPropRes.tierResults.tier1.passed === false && stringPropRes.errors.some(e => e.includes("must be typeof 'number'")),
    `Errors: ${stringPropRes.errors.join('; ')}`
  );

  // 6. Negative Fixture 5: Null numeric property (density: null)
  const nullProp = baseline.map((m, i) => (i === 4 ? { ...m, density: null } : m));
  const nullPropRes = validateDataset(nullProp);
  assertTest(
    'Negative Case 5: Null numeric property triggers Tier 1 null guard failure',
    nullPropRes.passed === false && nullPropRes.tierResults.tier1.passed === false && nullPropRes.errors.some(e => e.includes('cannot be null or undefined')),
    `Errors: ${nullPropRes.errors.join('; ')}`
  );

  // 7. Negative Fixture 6: NaN numeric property (modulus: NaN)
  const nanProp = baseline.map((m, i) => (i === 7 ? { ...m, modulus: NaN } : m));
  const nanPropRes = validateDataset(nanProp);
  assertTest(
    'Negative Case 6: NaN numeric property triggers Tier 1 NaN guard failure',
    nanPropRes.passed === false && nanPropRes.tierResults.tier1.passed === false && nanPropRes.errors.some(e => e.includes('cannot be NaN')),
    `Errors: ${nanPropRes.errors.join('; ')}`
  );

  // 8. Negative Fixture 7: Zero numeric property (price: 0 - fatal Recharts log scale)
  const zeroProp = baseline.map((m, i) => (i === 2 ? { ...m, price: 0 } : m));
  const zeroPropRes = validateDataset(zeroProp);
  assertTest(
    'Negative Case 7: Zero value (price=0) triggers Tier 2 Recharts log scale safety failure',
    zeroPropRes.passed === false && zeroPropRes.tierResults.tier2.passed === false && zeroPropRes.errors.some(e => e.includes('CRITICAL RECHARTS SAFETY VIOLATION')),
    `Errors: ${zeroPropRes.errors.join('; ')}`
  );

  // 9. Negative Fixture 8: Negative numeric property (modulus: -20)
  const negProp = baseline.map((m, i) => (i === 8 ? { ...m, modulus: -20 } : m));
  const negPropRes = validateDataset(negProp);
  assertTest(
    'Negative Case 8: Negative value (modulus=-20) triggers Tier 2 positivity failure',
    negPropRes.passed === false && negPropRes.tierResults.tier2.passed === false && negPropRes.errors.some(e => e.includes('strictly > 0')),
    `Errors: ${negPropRes.errors.join('; ')}`
  );

  // 10. Negative Fixture 9: Invalid family enum string ('Alloy')
  const badFamily = baseline.map((m, i) => (i === 1 ? { ...m, family: 'Alloy' } : m));
  const badFamilyRes = validateDataset(badFamily);
  assertTest(
    'Negative Case 9: Invalid family enum ("Alloy") triggers Tier 1 family enum failure',
    badFamilyRes.passed === false && badFamilyRes.tierResults.tier1.passed === false && badFamilyRes.errors.some(e => e.includes("'family' must be one of")),
    `Errors: ${badFamilyRes.errors.join('; ')}`
  );

  // 11. Negative Fixture 10: Invalid hex color format ('red' or '#FFF')
  const badColor = baseline.map((m, i) => (i === 6 ? { ...m, color: '#FF00' } : m));
  const badColorRes = validateDataset(badColor);
  assertTest(
    'Negative Case 10: Invalid hex color format ("#FF00") triggers Tier 2 color regex failure',
    badColorRes.passed === false && badColorRes.tierResults.tier2.passed === false && badColorRes.errors.some(e => e.includes('valid 6-digit hex format')),
    `Errors: ${badColorRes.errors.join('; ')}`
  );

  // 12. Negative Fixture 11: Duplicate material name
  const duplicateName = baseline.map((m, i) => (i === 10 ? { ...m, name: baseline[0].name } : m));
  const duplicateNameRes = validateDataset(duplicateName);
  assertTest(
    'Negative Case 11: Duplicate material name triggers Tier 1 uniqueness failure',
    duplicateNameRes.passed === false && duplicateNameRes.tierResults.tier1.passed === false && duplicateNameRes.errors.some(e => e.includes('Duplicate material name detected')),
    `Errors: ${duplicateNameRes.errors.join('; ')}`
  );

  // 13. Negative Fixture 12: Unphysical elasticity modulus ratio (K=0.01, E=500 -> K/E=0.00002)
  const badRatio = baseline.map((m, i) => (i === 0 ? { ...m, bulkModulus: 0.01, modulus: 500 } : m));
  const badRatioRes = validateDataset(badRatio);
  assertTest(
    'Negative Case 12: Extreme unphysical elasticity ratio (K/E=0.00002) triggers Tier 3 anomaly failure',
    badRatioRes.passed === false && badRatioRes.tierResults.tier3.passed === false && badRatioRes.errors.some(e => e.includes('Elasticity anomaly')),
    `Errors: ${badRatioRes.errors.join('; ')}`
  );

  const duration = Date.now() - startTime;
  console.log(`\n======================================================================`);
  console.log(`  SELF-TEST SUMMARY: ${passedTests}/${totalTests} tests passed (${duration}ms)`);
  console.log(`======================================================================\n`);

  if (passedTests === totalTests) {
    console.log(`✅ ALL TEST HARNESS CHECKS PASSED PERFECTLY!\n`);
    return true;
  } else {
    console.error(`❌ ${totalTests - passedTests} TEST(S) FAILED IN TEST HARNESS!\n`);
    return false;
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Materials Database Validation Runner

Usage:
  node scripts/validate_data.js [file_path]       Validate specific JSON file
  node scripts/validate_data.js                   Validate default data.json and public/data.json
  node scripts/validate_data.js --test            Execute comprehensive self-test suite (13 fixtures)
  node scripts/validate_data.js --help            Show this help screen

Tiers:
  Tier 1: Feature Coverage (50<=N<=75, required fields, data types, 5 families)
  Tier 2: Boundary & Corner Cases (strict positivity >0, Recharts log scale safety, hex regex)
  Tier 3: Cross-Feature Interactions (K/E modulus ratios, yield strains, density bounds)
  Tier 4: Recharts Simulation (log10 scatter point coordinate projection, family filters)
`);
    process.exit(0);
  }

  if (args.includes('--test') || args.includes('--self-test')) {
    const success = runSelfTestSuite();
    process.exit(success ? 0 : 1);
  }

  console.log(`======================================================================`);
  console.log(`  MATERIALS DATABASE VALIDATION RUNNER`);
  console.log(`======================================================================\n`);

  const filesToValidate = [];

  if (args.length > 0 && !args[0].startsWith('--')) {
    // Custom paths passed
    for (const arg of args) {
      if (!arg.startsWith('--')) {
        filesToValidate.push(path.resolve(process.cwd(), arg));
      }
    }
  } else {
    // Default paths: project root data.json and public/data.json
    const rootPath = path.resolve(process.cwd(), 'data.json');
    const publicPath = path.resolve(process.cwd(), 'public/data.json');
    filesToValidate.push(rootPath);
    filesToValidate.push(publicPath);
  }

  let totalFilesChecked = 0;
  let allFilesPassed = true;

  for (const filePath of filesToValidate) {
    console.log(`----------------------------------------------------------------------`);
    console.log(`Target: ${filePath}`);
    console.log(`----------------------------------------------------------------------`);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      console.log(`   (If Milestone 2 compilation has not run yet, file will be created by M2)`);
      continue;
    }

    totalFilesChecked++;
    let rawContent;
    try {
      rawContent = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      console.error(`❌ CRITICAL: Failed to read file: ${err.message}`);
      allFilesPassed = false;
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (err) {
      console.error(`❌ CRITICAL: Malformed JSON syntax in ${filePath}: ${err.message}`);
      allFilesPassed = false;
      continue;
    }

    const validation = validateDataset(parsed);

    // Print breakdown
    console.log(`📊 Validation Breakdown:`);
    console.log(`   ${validation.tierResults.tier1.passed ? '✅' : '❌'} ${validation.tierResults.tier1.name} (${validation.tierResults.tier1.checks} checks)`);
    console.log(`   ${validation.tierResults.tier2.passed ? '✅' : '❌'} ${validation.tierResults.tier2.name} (${validation.tierResults.tier2.checks} checks)`);
    console.log(`   ${validation.tierResults.tier3.passed ? '✅' : '❌'} ${validation.tierResults.tier3.name} (${validation.tierResults.tier3.checks} checks)`);
    console.log(`   ${validation.tierResults.tier4.passed ? '✅' : '❌'} ${validation.tierResults.tier4.name} (${validation.tierResults.tier4.checks} checks)`);

    if (validation.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${validation.warnings.length}):`);
      validation.warnings.slice(0, 5).forEach(w => console.log(`   ${w}`));
    }

    if (!validation.passed) {
      allFilesPassed = false;
      console.error(`\n❌ FAILED with ${validation.errors.length} error(s):`);
      validation.errors.slice(0, 15).forEach(e => console.error(`   ${e}`));
      if (validation.errors.length > 15) {
        console.error(`   ... and ${validation.errors.length - 15} additional errors.`);
      }
    } else {
      console.log(`\n✅ PASSED: All ${parsed.length} materials strictly conform across all 4 tiers!`);
      console.log(`   - Count: ${parsed.length} (within ${COUNT_MIN}-${COUNT_MAX})`);
      console.log(`   - Recharts Log-Scale: 100% positive finite coordinates verified`);
      console.log(`   - 0 nulls, 0 NaNs, 0 string types in numeric fields`);
    }
    console.log();
  }

  // If both default files were checked and exist, verify parity
  const rootPath = path.resolve(process.cwd(), 'data.json');
  const publicPath = path.resolve(process.cwd(), 'public/data.json');
  if (fs.existsSync(rootPath) && fs.existsSync(publicPath)) {
    console.log(`----------------------------------------------------------------------`);
    console.log(`Dual-File Parity Check (data.json <-> public/data.json)`);
    console.log(`----------------------------------------------------------------------`);
    const parity = validateParity(rootPath, publicPath);
    if (parity.passed) {
      console.log(`✅ Dual locations are identical in content and record count.\n`);
    } else {
      console.error(`❌ Parity failure: ${parity.errors.join('; ')}\n`);
      allFilesPassed = false;
    }
  }

  if (totalFilesChecked === 0) {
    console.log(`ℹ️  No data files exist yet. Running internal self-test suite to verify test infrastructure readiness...`);
    const testPassed = runSelfTestSuite();
    if (testPassed) {
      console.log(`✅ Test infrastructure is READY. Validation runner verified against 13 synthetic fixtures.`);
      process.exit(0);
    } else {
      process.exit(1);
    }
  }

  process.exit(allFilesPassed ? 0 : 1);
}

// Module exports for programmatic testing if imported as a module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateDataset,
    validateParity,
    runSelfTestSuite,
    createSyntheticValidDataset,
    PHYSICAL_BOUNDS,
    FAMILY_COLORS,
    VALID_FAMILIES,
    REQUIRED_NUMERIC_PROPERTIES,
    ALL_REQUIRED_PROPERTIES
  };
}

// Execute CLI when run directly
if (require.main === module) {
  main();
}
