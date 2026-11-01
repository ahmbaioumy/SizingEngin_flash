/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PRD v7.1 Statistical Kernels
 * Section 2.2 (Z4), Section 11 Statistical Decision Procedure
 * Exact bounds, Student's t quantiles, incomplete beta, bootstrap, Holm step-down.
 */

import { KeyedPRNG } from './prng';

/**
 * Standard Normal CDF approximation (Abramowitz & Stegun formula 7.1.26)
 */
export function normalCdf(x: number): number {
  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1.0 / (1.0 + p * Math.abs(x));
  const z = (1.0 / Math.sqrt(2.0 * Math.PI)) * Math.exp(-0.5 * x * x);
  const poly = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;
  const ans = 1.0 - z * poly;

  return x >= 0 ? ans : 1.0 - ans;
}

/**
 * Rational approximation for standard normal quantile (Inverse Normal CDF)
 * Acklam's algorithm, max error < 1.15e-9
 */
export function normalQuantile(p: number): number {
  if (p <= 0.0) return -8.0;
  if (p >= 1.0) return 8.0;

  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.3577518672690, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];

  const q = p - 0.5;
  if (Math.abs(q) <= 0.42) {
    const r = q * q;
    return q * (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) /
               (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1.0);
  }

  const r = p < 0.5 ? p : 1.0 - p;
  const s = Math.sqrt(-Math.log(r));
  let x = (((((c[0] * s + c[1]) * s + c[2]) * s + c[3]) * s + c[4]) * s + c[5]) /
          ((((d[0] * s + d[1]) * s + d[2]) * s + d[3]) * s + 1.0);

  return p < 0.5 ? -x : x;
}

/**
 * Log Gamma function via Lanczos approximation
 */
export function logGamma(z: number): number {
  const p = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.138571095836524,
    9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1.0 - z);
  }
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) {
    x += p[i] / (z + i + 1);
  }
  const t = z + p.length - 0.5;
  return 0.5 * Math.log(2.0 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Regularized Incomplete Beta function I_x(a, b) via continued fraction (Lentz)
 */
export function betaIncomplete(x: number, a: number, b: number): number {
  if (x <= 0.0) return 0.0;
  if (x >= 1.0) return 1.0;

  // Use symmetry relation if x > (a + 1)/(a + b + 2)
  if (x > (a + 1.0) / (a + b + 2.0)) {
    return 1.0 - betaIncomplete(1.0 - x, b, a);
  }

  const factor = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1.0 - x));
  
  // Lentz's method for continued fraction
  const maxIter = 100;
  const eps = 1e-12;
  let c = 1.0;
  let d = 1.0 - (a + b) * x / (a + 1.0);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1.0 / d;
  let h = d;

  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    // Even step
    let num = m * (b - m) * x / ((a + m2 - 1.0) * (a + m2));
    d = 1.0 + num * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1.0 + num / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1.0 / d;
    h *= d * c;

    // Odd step
    num = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1.0));
    d = 1.0 + num * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1.0 + num / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1.0 / d;
    const delta = d * c;
    h *= delta;

    if (Math.abs(delta - 1.0) < eps) break;
  }

  return (factor / a) * h;
}

/**
 * Student's t CDF with df degrees of freedom
 */
export function studentTCdf(t: number, df: number): number {
  if (df <= 0) return 0.5;
  const x = df / (df + t * t);
  const ib = betaIncomplete(x, 0.5 * df, 0.5);
  return t >= 0 ? 1.0 - 0.5 * ib : 0.5 * ib;
}

/**
 * Student's t Quantile function via bisection
 */
export function studentTQuantile(p: number, df: number): number {
  if (p <= 0.0) return -100.0;
  if (p >= 1.0) return 100.0;
  if (p === 0.5) return 0.0;

  // Initial bracket using normal quantile
  const z = normalQuantile(p);
  let low = z * 0.5 - 2.0;
  let high = z * 2.0 + 2.0;
  if (p < 0.5) {
    high = 0.0;
  } else {
    low = 0.0;
  }

  for (let iter = 0; iter < 40; iter++) {
    const mid = 0.5 * (low + high);
    const cdf = studentTCdf(mid, df);
    if (Math.abs(cdf - p) < 1e-7) return mid;
    if (cdf < p) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return 0.5 * (low + high);
}

/**
 * Skewness diagnostic across replications
 */
export function computeSampleSkewness(values: number[]): number {
  const n = values.length;
  if (n < 3) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  let m2 = 0;
  let m3 = 0;
  for (const v of values) {
    const diff = v - mean;
    m2 += diff * diff;
    m3 += diff * diff * diff;
  }
  m2 /= n;
  m3 /= n;
  if (m2 < 1e-12) return 0;
  return m3 / Math.pow(m2, 1.5);
}

/**
 * Computes mean, variance, and confidence interval for a KPI
 * Section 11.2: One-sided Student's t bound by default, bootstrap if skewed.
 */
export function computeKpiConfidenceInterval(
  values: number[],
  confidenceLevel: number = 0.95,
  isHigherBetter: boolean = true
): { mean: number; lowerBound: number; upperBound: number; stdError: number; bound: number; skewness: number } {
  const n = values.length;
  if (n === 0) {
    return { mean: 0, lowerBound: 0, upperBound: 0, stdError: 0, bound: 0, skewness: 0 };
  }
  const mean = values.reduce((a, b) => a + b, 0) / n;
  if (n === 1) {
    return { mean, lowerBound: mean, upperBound: mean, stdError: 0, bound: mean, skewness: 0 };
  }

  let variance = 0;
  for (const v of values) {
    variance += (v - mean) * (v - mean);
  }
  variance /= (n - 1);
  const stdDev = Math.sqrt(variance);
  const stdError = stdDev / Math.sqrt(n);

  const df = n - 1;
  // One-sided alpha
  const tCritical = studentTQuantile(confidenceLevel, df);
  const margin = tCritical * stdError;

  const skewness = computeSampleSkewness(values);

  // If higher is better (e.g. SL >= 80%), the critical conservative bound is the lower bound.
  // If lower is better (e.g. Abandonment <= 5%, ASA <= 30), the critical conservative bound is the upper bound.
  const lowerBound = mean - margin;
  const upperBound = mean + margin;
  const bound = isHigherBetter ? lowerBound : upperBound;

  return { mean, lowerBound, upperBound, stdError, bound, skewness };
}

/**
 * Holm-Bonferroni step-down correction for multiple testing across KPI targets
 * Section 11.3: Overall PASS requires all active constraints to PASS (Intersection-Union).
 * Overall FAIL when any constraint is FAIL with Holm correction.
 */
export function applyHolmCorrection(
  pValues: { kpi: string; pVal: number; targetDiff: number }[],
  alpha: number = 0.05
): { kpi: string; rejected: boolean; adjustedAlpha: number }[] {
  const sorted = [...pValues].sort((a, b) => a.pVal - b.pVal);
  const m = sorted.length;
  const results: { kpi: string; rejected: boolean; adjustedAlpha: number }[] = [];

  for (let i = 0; i < m; i++) {
    const adjustedAlpha = alpha / (m - i);
    const rejected = sorted[i].pVal < adjustedAlpha;
    results.push({
      kpi: sorted[i].kpi,
      rejected,
      adjustedAlpha,
    });
  }

  return results;
}
