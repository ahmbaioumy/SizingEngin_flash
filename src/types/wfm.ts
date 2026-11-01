/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PRD v7.1 Contact Center Minimum-HC Sizing & Scheduling Engine
 * Type Definitions and Schema
 */

export type RunMode = 'MODE_A' | 'MODE_B'; // Mode A = Find Min HC, Mode B = Fixed HC
export type Fidelity = 'QUICK' | 'SCREENED' | 'CERTIFIED';
export type StageId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S6B' | 'S7B';
export type StageStatus = 'LOCKED' | 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'STALE' | 'BLOCKED';

export type QueueClass = 'REAL_TIME' | 'DEFERRABLE';
export type SLType = 'SL1' | 'SL2' | 'SL3'; // SL1 = ans<=T/offered, SL2 = ans<=T/(offered-shortAbn), SL3 = ans<=T/ans

export interface QueueConfig {
  id: string;
  name: string;
  queueClass: QueueClass;
  targetSL: number; // e.g. 0.80 (80%)
  targetSLTime: number; // e.g. 20 (seconds)
  slType: SLType;
  targetASA: number; // e.g. 30 (seconds)
  targetAnswerRate: number; // e.g. 0.95 (95%)
  maxAbandonmentRate: number; // e.g. 0.05 (5%)
  targetDeadlinePct?: number; // for deferrable, e.g. 0.98 (98%)
  maxBacklogEnd?: number; // for deferrable, e.g. 0
  meanPatienceSec: number; // e.g. 180 sec
  patienceCV: number; // e.g. 0.8
  concurrencyLimit?: number; // for chat, e.g. 2 or 3
}

export interface PoolConfig {
  id: string;
  name: string;
  queueIds: string[];
  productivityFactor: number; // 1.0 = baseline, 0.9 = faster, 1.1 = slower
  minSeatsWhileOpen: number; // required minimum seats
  hcSearchCeiling: number; // required HC search ceiling
  occupancyCap?: number; // optional, e.g. 0.88
}

export interface RosterRuleConfig {
  allowedShiftStarts: string[]; // e.g. ["07:00", "08:00", "09:00", "13:00", "14:00", "22:00"]
  allowedShiftLengths: number[]; // e.g. [8, 9] (in hours)
  breakCount: number; // e.g. 2
  breakDurationMinutes: number; // e.g. 30
  breakWindowStartHour: number; // e.g. after 2h from start
  breakWindowEndHour: number; // e.g. before 2h from end
  minBreakSeparationMinutes: number; // e.g. 90
  breaksPaid: boolean;
  breaksCountTowardContract: boolean;
  weeklyOffDays: number; // e.g. 2
  adjacentOffDaysRequired: boolean;
  maxConsecutiveWorkDays: number; // e.g. 5
  minRestBetweenShiftsHours: number; // e.g. 11
  minWeeklyHours: number; // e.g. 36
  maxWeeklyHours: number; // e.g. 40
  rosterCycleWeeks: number; // e.g. 1 or 2
}

export interface ShrinkageComponent {
  id: string;
  name: string;
  rate: number; // e.g. 0.08 (8%)
  base: 'TOTAL_TIME' | 'PAID_TIME' | 'ON_DUTY_TIME';
  alreadyInRoster: boolean; // if true, excluded from residual grossing
}

export interface ShrinkageConfig {
  contractHoursPerWeek: number; // e.g. 40
  productiveHoursPerFTE: number; // e.g. 32
  components: ShrinkageComponent[];
}

export interface RunControls {
  replicationsQuick: number; // 1 (analytic/heuristic)
  replicationsScreened: number; // e.g. 10
  replicationsCertified: number; // e.g. 50
  confidenceLevel: number; // e.g. 0.95
  halfWidthPrecision: number; // e.g. 0.015
  timeQuantumSec: number; // e.g. 1.0 (exact Float64 quantum)
  warmupMinutes: number; // e.g. 30
  descentBudget: number; // e.g. 20
  seedBlock: number; // e.g. 42
  dualStabilizationBox: number;
}

export interface IntervalForecastRecord {
  date: string; // YYYY-MM-DD
  intervalStart: string; // HH:MM
  intervalMinutes: number; // 15, 30, or 60
  queueId: string;
  volume: number; // offered contacts
  ahtSec: number; // average handle time in seconds
}

export interface HistoryRecord {
  date: string;
  intervalStart: string;
  intervalMinutes: number;
  queueId: string;
  offeredVolume: number;
  handledVolume: number;
  ahtSec: number;
  abandonedVolume?: number;
}

export interface CleanedDatasetReport {
  totalRowsRaw: number;
  acceptedRows: number;
  rejectedRows: { row: number; key: string; reason: string; raw: string }[];
  removedNegatives: { row: number; field: string; value: number }[];
  removedAhtZero: { row: number; volume: number }[];
  removedExactDuplicates: number;
  conflictingDuplicatesHandled: { count: number; rule: 'FIRST' | 'LAST' | 'EXCLUDE_ALL' };
  gapsDetected: { date: string; interval: string; treatment: string }[];
  volumeRemovedAbsolute: number;
  volumeRemovedPercent: number;
  originalFileHash: string;
  cleanedDatasetHash: string;
  fingerprint: string;
}

export interface ForecastRelease {
  source: 'USER_FCT' | 'APP_FORECAST';
  methodUsed?: 'SEASONAL_NAIVE' | 'WEIGHTED_ANALOG' | 'QUASI_POISSON';
  releaseId: string;
  createdAt: string;
  dataHash: string;
  intervals: IntervalForecastRecord[];
  summary: {
    totalVolume: number;
    weightedAhtSec: number;
    totalWorkloadHours: number;
    intervalCount: number;
    startDate: string;
    endDate: string;
  };
  backtestResults?: {
    wape: number;
    mae: number;
    bias: number;
    pValVsNaive: number;
  };
}

export interface SimulatedKpiResult {
  queueId: string;
  sl: number;
  slConfidenceInterval: [number, number];
  slTarget: number;
  slPassed: boolean;
  asaSec: number;
  asaTarget: number;
  asaPassed: boolean;
  answerRate: number;
  answerRateTarget: number;
  answerRatePassed: boolean;
  abandonmentRate: number;
  abandonmentTarget: number;
  abandonmentPassed: boolean;
  occupancy: number;
  occupancyTarget?: number;
  occupancyPassed: boolean;
  overallPassed: boolean;
  bindingKpi: string;
}

export interface ShiftSchedule {
  agentId: string;
  agentName: string;
  poolId: string;
  dayIndex: number; // 0 to horizonDays - 1
  date: string;
  shiftStart: string; // "08:00"
  shiftEnd: string; // "17:00"
  shiftDurationHours: number;
  isOffDay: boolean;
  breaks: { start: string; durationMinutes: number }[];
}

export interface ValidatorViolation {
  ruleCode: string;
  ruleName: string;
  severity: 'HARD' | 'FINDING';
  agentId?: string;
  date?: string;
  description: string;
}

export interface ValidatorReport {
  passedHardRules: boolean;
  totalViolations: number;
  hardViolationsCount: number;
  findingsCount: number;
  violations: ValidatorViolation[];
  recalculatedKpis: {
    totalOffered: number;
    totalAnswered: number;
    totalAbandoned: number;
    overallSL: number;
    overallASA: number;
    overallOccupancy: number;
    conservationVerified: boolean;
  };
}

export interface ModeABridge {
  step0PureFte: number; // Pure requirement FTE-equivalent (workload basis)
  step0PureSeatHours: number;
  step0PeakSeats: number;
  step1PaidBreaksFte: number;
  step2ShiftShapeFte: number;
  step3WeeklyRulesFte: number;
  step4IntegerRosterFte: number;
  step5SimAdjustmentFte: number; // Certified / Screened Roster HC
  rosterHc: number;
  residualShrinkageRate: number;
  grossHc: number;
  rigorousLowerBoundHc: number;
  modelBasedBoundHc: number;
  gapToRigorousBound: number;
  stepBreakdown: {
    step: string;
    hc: number;
    delta: number;
    cause: string;
    isModelBased: boolean;
  }[];
}

export interface MinimalityProof {
  certifiedHc: number;
  confidenceLevel: number;
  kpisAtCertifiedHc: SimulatedKpiResult[];
  candidateMinusOneHc: number;
  kpisAtMinusOne: SimulatedKpiResult[];
  failingKpiAtMinusOne: string;
  rigorousLowerBound: number;
  modelBasedBound: number;
  indifferenceZone: number;
  certificationWording: string;
}

export interface StartListDiagnostic {
  currentStarts: string[];
  recommendedExtraStart: string;
  potentialHcSavings: number;
  explanation: string;
}

export interface GuardrailAnalysis {
  dailySlFloor: number;
  requiredDaysMetPct: number;
  additionalHcRequired: number;
  impactSummary: string;
}

export interface AssumptionExposureItem {
  name: string;
  currentValue: string;
  lowValue: string;
  highValue: string;
  hcImpactLow: number;
  hcImpactHigh: number;
}
