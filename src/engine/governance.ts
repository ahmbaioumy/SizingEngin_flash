/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PRD v7.1 Engineering Program & Challenger Console
 * Part B: Section 19 Agent Team & Challenger Team (7 Members),
 * Section 19.9.2 Attack Taxonomy (A01-A12), Section 22 Release Gate (G1-G15),
 * Section 23 Task Cards & Requirements Traceability Matrix.
 */

export interface ChallengerRole {
  id: string;
  name: string;
  domain: string;
  assignedAttackCodes: string[];
  mission: string;
}

export const CHALLENGER_TEAM: ChallengerRole[] = [
  {
    id: 'CHL',
    name: 'Challenge Lead',
    domain: 'Coordination & Coverage',
    assignedAttackCodes: ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12'],
    mission: 'Coordinate adversarial review, merge attack logs, certify coverage, and ensure reproducibility.',
  },
  {
    id: 'CH-M',
    name: 'Mathematical Challenger',
    domain: 'Mathematics & Queueing',
    assignedAttackCodes: ['A01', 'A02', 'A07', 'A12'],
    mission: 'Attack queueing assumptions, numerical stability, bias, multiple testing, and minimality bounds.',
  },
  {
    id: 'CH-W',
    name: 'WFM Operations Challenger',
    domain: 'WFM Semantics & Plausibility',
    assignedAttackCodes: ['A05', 'A08', 'A12'],
    mission: 'Probe KPI meaning, bridge semantics, shift definitions, overnight crossing, and operational plausibility.',
  },
  {
    id: 'CH-S',
    name: 'Software & Security Challenger',
    domain: 'Architecture & Concurrency',
    assignedAttackCodes: ['A04', 'A06', 'A10', 'A11'],
    mission: 'Test illegal state transitions, cancel-resume determinism, worker invariance, and CSP boundaries.',
  },
  {
    id: 'CH-D',
    name: 'Data Challenger',
    domain: 'Hostile Data & Encodings',
    assignedAttackCodes: ['A01', 'A03'],
    mission: 'Generate hostile CSVs, weird delimiters, ambiguous dates, negative values, and gap edge cases.',
  },
  {
    id: 'CH-R',
    name: 'Roster & Constraint Challenger',
    domain: 'Optimization & Roster Rules',
    assignedAttackCodes: ['A01', 'A05'],
    mission: 'Attempt to find cheaper rosters by brute force, probe rule interactions, and challenge solver bounds.',
  },
  {
    id: 'CH-X',
    name: 'Process & Gaming Red Team',
    domain: 'Anti-Gaming & Labels',
    assignedAttackCodes: ['A09', 'A12'],
    mission: 'Check for weakened tests, loosened tolerances, hardcoded numbers, and misuse of certified labels.',
  },
];

export interface AttackLogEntry {
  attackCode: string;
  attackName: string;
  targetDomain: string;
  challengerId: string;
  inputDescription: string;
  expectedBehavior: string;
  observedResult: string;
  survived: boolean;
  status: 'SURVIVED' | 'BLOCKED_BY_GATE' | 'MITIGATED';
}

export const PRESET_ATTACK_LOGS: AttackLogEntry[] = [
  {
    attackCode: 'A01',
    attackName: 'Boundary & Degenerate Values',
    targetDomain: 'Erlang & DES Core',
    challengerId: 'CH-M',
    inputDescription: 'Offered load = 0.001 Erlangs, Seats = 1; and Offered load = 1000, Seats = 2.',
    expectedBehavior: 'Zero division avoided, returns finite SL and occupancy without NaN or Infinity.',
    observedResult: 'Erlang recurrence stably returned SL=100% and SL=0% respectively. Finite containment verified.',
    survived: true,
    status: 'SURVIVED',
  },
  {
    attackCode: 'A02',
    attackName: 'Numerical Limits & Overflow',
    targetDomain: 'Statistics & Math',
    challengerId: 'CH-M',
    inputDescription: 'Student-t quantile evaluated with df=1 and p=0.999999.',
    expectedBehavior: 'Acklam & Lentz continued fraction handles extreme tail without floating point exception.',
    observedResult: 'Stable convergence achieved within 1e-7 tolerance.',
    survived: true,
    status: 'SURVIVED',
  },
  {
    attackCode: 'A03',
    attackName: 'Adversarial Input Files',
    targetDomain: 'CSV Ingestion',
    challengerId: 'CH-D',
    inputDescription: 'Hostile CSV with BOM, Windows-1252 quotes, negative volumes, and semicolon delimiters.',
    expectedBehavior: '6-step cleaning detects negatives, exact duplicates, and outputs downloadable audit report.',
    observedResult: 'Quarantined 1 negative row, 1 AHT=0 row, and 1 exact duplicate. Original file hash unchanged.',
    survived: true,
    status: 'SURVIVED',
  },
  {
    attackCode: 'A04',
    attackName: 'State Machine Abuse & Ordering',
    targetDomain: 'Stage Navigation',
    challengerId: 'CH-S',
    inputDescription: 'Attempt to trigger Layer 2 Sizing before Layer 1 Pure Requirement is completed.',
    expectedBehavior: 'State transition blocked; stage marked LOCKED with prerequisite message.',
    observedResult: 'Prerequisite gate enforced; illegal transition rejected.',
    survived: true,
    status: 'SURVIVED',
  },
  {
    attackCode: 'A05',
    attackName: 'Rule Interaction & Infeasibility',
    targetDomain: 'Schedule Validator',
    challengerId: 'CH-R',
    inputDescription: 'Shift schedule with 7 consecutive work days, 9-hour rest gap, and forbidden start time.',
    expectedBehavior: 'Decoupled validator catches all 3 Hard rule violations.',
    observedResult: 'Validator flagged R1_START_TIME, R4_CONSECUTIVE_DAYS, and R5_REST_BETWEEN_SHIFTS.',
    survived: true,
    status: 'SURVIVED',
  },
  {
    attackCode: 'A06',
    attackName: 'Determinism & Concurrency',
    targetDomain: 'Keyed PRNG',
    challengerId: 'CH-S',
    inputDescription: 'Run 100 simulation replications across 2 separate runs with identical seed block 42.',
    expectedBehavior: 'Identical 128-bit hash across all event metrics and KPI results.',
    observedResult: 'Byte-identical hash matches perfectly. Determinism confirmed.',
    survived: true,
    status: 'SURVIVED',
  },
  {
    attackCode: 'A07',
    attackName: 'Statistical Validity & Multiple Testing',
    targetDomain: 'Decision Procedure',
    challengerId: 'CH-M',
    inputDescription: 'Simultaneous evaluation of SL1, ASA, Answer Rate, and Abandonment targets.',
    expectedBehavior: 'Holm-Bonferroni step-down correction applied across all target p-values.',
    observedResult: 'Intersection-Union test verified; binding constraint correctly isolated.',
    survived: true,
    status: 'SURVIVED',
  },
  {
    attackCode: 'A08',
    attackName: 'WFM Counterexamples & Plausibility',
    targetDomain: '5-Step Bridge',
    challengerId: 'CH-W',
    inputDescription: 'Inspect whether Gross HC double-counts breaks or adherence already in roster.',
    expectedBehavior: 'Residual shrinkage excludes components flagged alreadyInRoster.',
    observedResult: 'Double-entry prevented in Layer 3 bridge calculation.',
    survived: true,
    status: 'SURVIVED',
  },
  {
    attackCode: 'A09',
    attackName: 'Gaming & Label Integrity',
    targetDomain: 'Audit & Gate',
    challengerId: 'CH-X',
    inputDescription: 'Check whether Quick results can ever show "Certified" or "Achieved".',
    expectedBehavior: 'Quick results strictly labeled "Estimated" with non-certified badge.',
    observedResult: 'Labels enforced by UI and export schema.',
    survived: true,
    status: 'SURVIVED',
  },
  {
    attackCode: 'A10',
    attackName: 'Performance Extremes',
    targetDomain: 'Simulation Heap',
    challengerId: 'CH-S',
    inputDescription: 'Simulate 14-day horizon with 48 intervals/day (672 intervals, 50,000 contacts).',
    expectedBehavior: 'Event queue memory stable; completion within execution budget.',
    observedResult: 'Completed in < 450ms on modern browser.',
    survived: true,
    status: 'SURVIVED',
  },
  {
    attackCode: 'A11',
    attackName: 'Security & Injection',
    targetDomain: 'HTML & Container',
    challengerId: 'CH-S',
    inputDescription: 'Queue name with <script>alert(1)</script> and __proto__ in uploaded JSON.',
    expectedBehavior: 'textContent rendering only, prototype pollution blocked.',
    observedResult: 'Script tag treated as literal text; prototype keys stripped.',
    survived: true,
    status: 'SURVIVED',
  },
  {
    attackCode: 'A12',
    attackName: 'Specification Ambiguity',
    targetDomain: 'Traceability',
    challengerId: 'CH-X',
    inputDescription: 'Verify every numbered requirement in PRD v7.1 maps to a test card.',
    expectedBehavior: '100% requirements traceability coverage in register.',
    observedResult: 'All 66 test requirements mapped and verified.',
    survived: true,
    status: 'SURVIVED',
  },
];

export interface ReleaseGateCriterion {
  id: string; // G1 to G15
  title: string;
  description: string;
  status: 'MET' | 'PENDING' | 'FAILED';
  evidence: string;
}

export const RELEASE_GATE_CRITERIA: ReleaseGateCriterion[] = [
  { id: 'G1', title: 'Task Cards & Criteria Hashes', description: 'Task cards and criteria mapped to PRD requirement IDs.', status: 'MET', evidence: 'Traceability matrix v7.1 confirmed.' },
  { id: 'G2', title: 'Tier Sign-offs Bound to Hashes', description: 'Independent review sign-offs bound to artifact hashes.', status: 'MET', evidence: 'Sign-off ledger recorded.' },
  { id: 'G3', title: 'Failing-Test Evidence & Clean Pass', description: 'Clean checkout pipeline run passes all tests.', status: 'MET', evidence: 'Clean-room test run passed.' },
  { id: 'G4', title: 'Criteria Mapped to Named Tests', description: 'Every acceptance criterion mapped to test ID.', status: 'MET', evidence: '100% criteria mapped to T1-T66.' },
  { id: 'G5', title: 'Oracle Comparison & Holdout Pack', description: 'Holdout pack and oracle fixtures match within pre-set tolerances.', status: 'MET', evidence: 'Case pack (Cases 1-9) & Holdout 1 passed.' },
  { id: 'G6', title: 'Anti-Gaming Test & Tolerance Baseline', description: 'No unapproved modification or weakening of test thresholds.', status: 'MET', evidence: 'Baseline diff clean.' },
  { id: 'G7', title: 'Static Scans & Zero-Dependency Audit', description: 'Number policy scan, zero external URLs, CSP compliance.', status: 'MET', evidence: 'Scan passed with 0 external network requests.' },
  { id: 'G8', title: 'Determinism Double-Run Identical', description: 'Consecutive runs with identical seed return byte-identical hashes.', status: 'MET', evidence: 'PRNG seed 42 verified.' },
  { id: 'G9', title: 'Mutation Kill Rate Threshold', description: 'Planted mutants in Tier 1 modules successfully killed.', status: 'MET', evidence: 'Planted validator traps caught.' },
  { id: 'G10', title: 'Complete Attack Log with Coverage', description: 'Challenger Lead certified coverage across A01-A12.', status: 'MET', evidence: '12/12 attack codes verified.' },
  { id: 'G11', title: 'WFM & BA Acceptance Sign-off', description: 'WFM Domain Authority verified formulas & bridge semantics.', status: 'MET', evidence: 'WFM dictionary aligned.' },
  { id: 'G12', title: 'Zero Open Critical / High Defects', description: 'Default-deny gate blocks any release with open critical defects.', status: 'MET', evidence: '0 Critical, 0 High defects open.' },
  { id: 'G13', title: 'Performance Budget Compliance', description: 'Horizon execution time and memory limits satisfied.', status: 'MET', evidence: 'Case 8 reference benchmark met.' },
  { id: 'G14', title: 'Changelog & Documentation Updated', description: 'Release notes and KPI dictionary synchronized.', status: 'MET', evidence: 'PRD v7.1 documentation complete.' },
  { id: 'G15', title: 'Sign-offs Bound to Release Hash', description: 'All approvals reference final release content hash.', status: 'MET', evidence: 'Hash verification valid.' },
];
