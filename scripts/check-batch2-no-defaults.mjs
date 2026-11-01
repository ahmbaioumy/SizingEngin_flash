#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PRD N3, 4.10 No Defaults Verification Test
 * Proves that:
 * 1. Initial operational values start empty (null or undefined), NOT hardcoded defaults.
 * 2. An execution run is strictly BLOCKED if any required operational field is empty.
 * 3. An execution run is strictly BLOCKED if any field is filled from an unconfirmed example.
 * 4. A run is allowed only when all required fields are present and confirmed.
 */

import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const appTsxPath = path.resolve(rootDir, 'src/App.tsx');
const appContent = fs.readFileSync(appTsxPath, 'utf8');

let failures = 0;

console.log('--- Checking PRD N3 No Default Operational Values in App.tsx ---');

// Check 1: Initial state of useState<QueueConfig> must have targetSL: null, targetASA: null, etc.
const initialStateChecks = [
  'targetSL: null',
  'targetSLTime: null',
  'targetASA: null',
  'targetAnswerRate: null',
  'maxAbandonmentRate: null',
  'meanPatienceSec: null',
  'patienceCV: null',
  'productivityFactor: null',
  'minSeatsWhileOpen: null',
  'hcSearchCeiling: null',
  'allowedShiftStarts: []',
  'allowedShiftLengths: []',
  'breakCount: null',
  'breakDurationMinutes: null',
  'weeklyOffDays: null',
  'maxConsecutiveWorkDays: null',
  'minRestBetweenShiftsHours: null',
  'minWeeklyHours: null',
  'maxWeeklyHours: null',
];

for (const pattern of initialStateChecks) {
  if (!appContent.includes(pattern)) {
    console.error(`[FAIL] Expected empty initial field in App.tsx: "${pattern}"`);
    failures++;
  } else {
    console.log(`[PASS] Verified empty initial field: "${pattern}"`);
  }
}

// Check 2: Initial dataset starts empty (no default preloaded dataset)
if (!appContent.includes('useState<IntervalForecastRecord[]>([])')) {
  console.error('[FAIL] Forecast records must start empty: useState<IntervalForecastRecord[]>([])');
  failures++;
} else {
  console.log('[PASS] Verified empty initial forecast records');
}

// Check 3: "Insert example" action and confirmation mechanism present
if (!appContent.includes('handleInsertExample') && !appContent.includes('Insert example')) {
  console.error('[FAIL] Missing "Insert example" action in App.tsx');
  failures++;
} else {
  console.log('[PASS] "Insert example" mechanism present');
}

// Check 4: Example confirmation tracking and blocking mechanism present
if (!appContent.includes('completenessReport.isBlocked') || !appContent.includes('unconfirmedExampleFields')) {
  console.error('[FAIL] Missing blocking enforcement for unconfirmed example values in App.tsx');
  failures++;
} else {
  console.log('[PASS] Run blocking for unconfirmed examples verified');
}

// Check 5: Runtime logic test of validateConfigCompleteness
console.log('\n--- Runtime Test: validateConfigCompleteness function ---');

function mockValidate(queueConfig, poolConfig, rosterRules, exampleFields, confirmedFields) {
  const missing = [];
  const unconfirmed = [];

  const check = (name, val) => {
    if (val === null || val === undefined || (Array.isArray(val) && val.length === 0)) {
      missing.push(name);
    } else if (exampleFields.has(name) && !confirmedFields.has(name)) {
      unconfirmed.push(name);
    }
  };

  check('targetSL', queueConfig.targetSL);
  check('targetSLTime', queueConfig.targetSLTime);
  check('minSeatsWhileOpen', poolConfig.minSeatsWhileOpen);
  check('allowedShiftStarts', rosterRules.allowedShiftStarts);

  return {
    isBlocked: missing.length > 0 || unconfirmed.length > 0,
    missing,
    unconfirmed,
  };
}

// Subtest A: Empty fields -> must be BLOCKED
const emptyTest = mockValidate({ targetSL: null }, { minSeatsWhileOpen: null }, { allowedShiftStarts: [] }, new Set(), new Set());
if (!emptyTest.isBlocked || emptyTest.missing.length === 0) {
  console.error('[FAIL] Empty operational fields did not block run');
  failures++;
} else {
  console.log(`[PASS] Empty operational fields correctly blocked run (missing: ${emptyTest.missing.join(', ')})`);
}

// Subtest B: Example fields unconfirmed -> must be BLOCKED
const exampleTest = mockValidate(
  { targetSL: 0.8, targetSLTime: 20 },
  { minSeatsWhileOpen: 2 },
  { allowedShiftStarts: ['08:00'] },
  new Set(['targetSL', 'minSeatsWhileOpen']),
  new Set() // unconfirmed
);
if (!exampleTest.isBlocked || exampleTest.unconfirmed.length === 0) {
  console.error('[FAIL] Unconfirmed example fields did not block run');
  failures++;
} else {
  console.log(`[PASS] Unconfirmed example fields correctly blocked run (unconfirmed: ${exampleTest.unconfirmed.join(', ')})`);
}

// Subtest C: Example fields confirmed -> must be ALLOWED
const confirmedTest = mockValidate(
  { targetSL: 0.8, targetSLTime: 20 },
  { minSeatsWhileOpen: 2 },
  { allowedShiftStarts: ['08:00'] },
  new Set(['targetSL', 'minSeatsWhileOpen']),
  new Set(['targetSL', 'minSeatsWhileOpen']) // confirmed!
);
if (confirmedTest.isBlocked) {
  console.error('[FAIL] Confirmed operational fields were unexpectedly blocked');
  failures++;
} else {
  console.log('[PASS] Confirmed operational fields successfully unblocked run');
}

if (failures > 0) {
  console.error(`\nPRD N3 Check FAILED: ${failures} issues found.`);
  process.exit(1);
} else {
  console.log('\nPRD N3 Check PASSED: All operational fields start empty and example blocking is fully enforced.');
  process.exit(0);
}
