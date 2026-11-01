#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PRD Z1, Z2 Dependency Checker
 * Plain Node script without any npm imports.
 * Fails if package.json lists any dependency outside scripts/dep-allowlist.json.
 */

import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const packageJsonPath = path.resolve(rootDir, 'package.json');
const allowlistPath = path.resolve(rootDir, 'scripts/dep-allowlist.json');

if (!fs.existsSync(packageJsonPath)) {
  console.error(`ERROR: package.json not found at ${packageJsonPath}`);
  process.exit(1);
}

if (!fs.existsSync(allowlistPath)) {
  console.error(`ERROR: allowlist not found at ${allowlistPath}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));

function isAllowed(dep, allowedList) {
  for (const item of allowedList) {
    if (item === dep) return true;
    if (item.endsWith('/*')) {
      const prefix = item.slice(0, -2);
      if (dep.startsWith(prefix)) return true;
    }
  }
  return false;
}

let violations = 0;

console.log('--- Checking package.json dependencies against allowlist ---');

const deps = pkg.dependencies || {};
for (const dep of Object.keys(deps)) {
  if (!isAllowed(dep, allowlist.dependencies || [])) {
    console.error(`[FAIL] Forbidden runtime dependency: "${dep}" (version ${deps[dep]})`);
    violations++;
  } else {
    console.log(`[PASS] Allowed runtime dependency: ${dep}`);
  }
}

const devDeps = pkg.devDependencies || {};
for (const dep of Object.keys(devDeps)) {
  if (!isAllowed(dep, allowlist.devDependencies || [])) {
    console.error(`[FAIL] Forbidden devDependency: "${dep}" (version ${devDeps[dep]})`);
    violations++;
  } else {
    console.log(`[PASS] Allowed devDependency: ${dep}`);
  }
}

if (violations > 0) {
  console.error(`\nCheck-deps FAILED: ${violations} forbidden dependencies found.`);
  process.exit(1);
} else {
  console.log(`\nCheck-deps PASSED: All dependencies conform to PRD Z1/Z2 allowlist.`);
  process.exit(0);
}
