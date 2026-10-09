# Original User Request

## Initial Request — 2026-10-08T20:38:49Z

Compile a massive static JSON database of real-world commercial materials (including polymers, woods, composites, metals, and ceramics) with their mechanical properties and estimated prices, using a team of agents to research and fact-check the data.

Working directory: /Users/johnathanhare/materials-dashboard
Integrity mode: benchmark

## Requirements

### R1. Gather Verified Material Data
Research and compile 50-75 common commercial and engineering materials across families (Metals, Polymers, Ceramics, Composites, Natural). Extract the following properties: Name, Density (g/cm³), Yield Strength (MPa), Young's Modulus (GPa), Bulk Modulus (GPa), Price ($/kg), Family, and Color (hex code).

### R2. Strict Fact-Checking
Do not guess or hallucinate values. Every data point must be actively researched and verified via web search or open databases. If accurate data cannot be found for a material, omit it.

### R3. Output Deliverables
1. A strongly typed `data.json` file containing the final array.
2. A `Verification_Report.md` detailing the methodology and sources used.

## Acceptance Criteria

### Data Quality & Schema
- [ ] `data.json` contains exactly 50-75 materials.
- [ ] Every material contains all required numeric fields (no nulls or strings for numeric properties).
- [ ] `Verification_Report.md` includes links/citations for at least 3 primary sources used during research.

### Independent Verification
- [ ] The agent team must programmatically validate the `data.json` schema before finishing to ensure it won't crash the Recharts frontend.
