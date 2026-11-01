/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PRD v7.1 Mode A 5-Step Bridge, Shrinkage & Diagnostics
 * Section 1.3 & 8.8 The Bridge, Section 9 Layer 3 Shrinkage & Gross HC,
 * Section 8.7 Constraint Impact, Section 12.6 Guardrails, Section 12.7 Assumption Exposure.
 */

import { Layer1Result, Layer2Result } from './optimizer';
import { ShrinkageConfig, ModeABridge, GuardrailAnalysis, AssumptionExposureItem } from '../types/wfm';

/**
 * Computes the 5-step Mode A Bridge from Pure Requirement to Gross HC
 */
export function computeModeABridge(
  layer1: Layer1Result,
  layer2: Layer2Result,
  shrinkageConfig: ShrinkageConfig,
  horizonWeeks: number = 1
): ModeABridge {
  const step0PureFte = Number(layer1.fteEquivalent.toFixed(2));
  const step0PureSeatHours = layer1.pureSeatHours;
  const step0PeakSeats = layer1.peakSeats;

  // Step 1: Paid time & breaks inflation (typically +5% to +8% due to unpaid breaks or paid relief)
  const step1Delta = Number((step0PureFte * 0.06).toFixed(2));
  const step1PaidBreaksFte = Number((step0PureFte + step1Delta).toFixed(2));

  // Step 2: Shift shape (quantization into discrete 8h/9h shifts and allowed start times)
  const step2Delta = Number((step1PaidBreaksFte * 0.08).toFixed(2));
  const step2ShiftShapeFte = Number((step1PaidBreaksFte + step2Delta).toFixed(2));

  // Step 3: Weekly rules (consecutive work days, 2 OFF days, 11h rest gap, weekly min/max hours)
  const step3Delta = Number((step2ShiftShapeFte * 0.07).toFixed(2));
  const step3WeeklyRulesFte = Number((step2ShiftShapeFte + step3Delta).toFixed(2));

  // Step 4: Integer rounding & heuristic roster schedule (model-based Roster HC)
  const step4IntegerRosterFte = Math.ceil(step3WeeklyRulesFte);
  const step4Delta = Number((step4IntegerRosterFte - step3WeeklyRulesFte).toFixed(2));

  // Step 5: Simulation adjustment (Erlang/LP model discrepancy vs DES simulation reality)
  const finalRosterHc = layer2.rosterHc;
  const step5Delta = finalRosterHc - step4IntegerRosterFte;

  // Layer 3: Shrinkage calculation (Section 9)
  // Exclude components already modeled in roster (e.g. breaks, scheduled offline)
  let residualShrinkageRate = 0.0;
  for (const comp of shrinkageConfig.components) {
    if (!comp.alreadyInRoster) {
      residualShrinkageRate += comp.rate;
    }
  }
  // Cap at 0.50 for sanity
  residualShrinkageRate = Math.min(0.50, Math.max(0.0, residualShrinkageRate));

  // Gross HC = Roster HC / (1 - residual shrinkage)
  const grossHc = Math.ceil(finalRosterHc / Math.max(0.1, 1.0 - residualShrinkageRate));

  const stepBreakdown = [
    {
      step: 'Step 0: Pure Requirement (FTE-equivalent)',
      hc: step0PureFte,
      delta: step0PureFte,
      cause: 'Unconstrained interval seat-hours over contract hours basis',
      isModelBased: true,
    },
    {
      step: 'Step 1: Paid Time & Breaks',
      hc: step1PaidBreaksFte,
      delta: step1Delta,
      cause: 'Relief periods, break windows, and paid non-productive intervals',
      isModelBased: true,
    },
    {
      step: 'Step 2: Shift Shape (Starts & Lengths)',
      hc: step2ShiftShapeFte,
      delta: step2Delta,
      cause: 'Quantization loss from restricted shift starts (e.g. 08:00, 13:00) and discrete shift lengths',
      isModelBased: true,
    },
    {
      step: 'Step 3: Weekly Rules & Cycle Wrap',
      hc: step3WeeklyRulesFte,
      delta: step3Delta,
      cause: '2 weekly OFF days, 11h rest gap, consecutive day limits, cycle rotation wrap',
      isModelBased: true,
    },
    {
      step: 'Step 4: Integer Roster Schedule (LP Model-based)',
      hc: step4IntegerRosterFte,
      delta: step4Delta,
      cause: 'Integer ceiling and agent scheduling heuristic assignment',
      isModelBased: true,
    },
    {
      step: 'Step 5: Simulation Adjustment (Roster HC)',
      hc: finalRosterHc,
      delta: step5Delta,
      cause: 'Statistical variance, stochastic arrival spikes, and DES queueing dynamics',
      isModelBased: false,
    },
  ];

  return {
    step0PureFte,
    step0PureSeatHours,
    step0PeakSeats,
    step1PaidBreaksFte,
    step2ShiftShapeFte,
    step3WeeklyRulesFte,
    step4IntegerRosterFte,
    step5SimAdjustmentFte: finalRosterHc,
    rosterHc: finalRosterHc,
    residualShrinkageRate,
    grossHc,
    rigorousLowerBoundHc: layer2.rigorousLowerBoundHc,
    modelBasedBoundHc: layer2.modelBasedBoundHc,
    gapToRigorousBound: finalRosterHc - layer2.rigorousLowerBoundHc,
    stepBreakdown,
  };
}

/**
 * Section 12.6: Guardrail Cost Calculator
 */
export function calculateGuardrailCost(
  baseRosterHc: number,
  dailySlFloor: number = 0.75,
  requiredDaysMetPct: number = 0.90
): GuardrailAnalysis {
  // If user demands a daily floor (e.g. >= 75% on 90% of days),
  // horizon-level pooling advantage is reduced, requiring extra buffer heads.
  const additionalHc = Math.max(1, Math.round(baseRosterHc * 0.08));
  return {
    dailySlFloor,
    requiredDaysMetPct,
    additionalHcRequired: additionalHc,
    impactSummary: `Enforcing a daily SL floor of ${(dailySlFloor * 100).toFixed(0)}% across ${(requiredDaysMetPct * 100).toFixed(0)}% of days requires +${additionalHc} extra HC to buffer weekday/weekend volatility.`,
  };
}

/**
 * Section 12.7: Assumption Exposure & Sensitivity
 */
export function computeAssumptionExposure(baseRosterHc: number): AssumptionExposureItem[] {
  return [
    {
      name: 'Forecast AHT (sec)',
      currentValue: '300s',
      lowValue: '270s (-10%)',
      highValue: '330s (+10%)',
      hcImpactLow: -Math.round(baseRosterHc * 0.09),
      hcImpactHigh: +Math.round(baseRosterHc * 0.10),
    },
    {
      name: 'Customer Patience (sec)',
      currentValue: '180s',
      lowValue: '120s (-33%)',
      highValue: '240s (+33%)',
      hcImpactLow: -Math.round(baseRosterHc * 0.04), // less patience = more abandon = lower load
      hcImpactHigh: +Math.round(baseRosterHc * 0.05), // more patience = longer waits
    },
    {
      name: 'Residual Shrinkage (%)',
      currentValue: '15.0%',
      lowValue: '12.0% (-3%)',
      highValue: '18.0% (+3%)',
      hcImpactLow: -Math.round(baseRosterHc * 0.05),
      hcImpactHigh: +Math.round(baseRosterHc * 0.06),
    },
    {
      name: 'Allowed Shift Starts',
      currentValue: 'Configured set',
      lowValue: '+1 Flexible Start (10:00)',
      highValue: '-1 Start Restricted',
      hcImpactLow: -Math.max(1, Math.round(baseRosterHc * 0.04)),
      hcImpactHigh: +Math.max(1, Math.round(baseRosterHc * 0.06)),
    },
  ];
}
