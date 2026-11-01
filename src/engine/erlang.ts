/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PRD v7.1 Queueing Models & Bounds
 * Section 7.1 Hours & Valid Bounds, Section 7.2 Erlang Module
 * Erlang B recurrence, Erlang C, Erlang A, Workload W, phi_min.
 */

import { K } from './constants';

export interface ErlangResult {
  offeredLoadErlangs: number;
  seats: number;
  erlangB: number; // Blocking probability
  erlangC: number; // Delay probability
  serviceLevel: number; // Probability of answer within target seconds T
  asaSec: number; // Average Speed of Answer in seconds
  occupancy: number; // Workload occupancy (talk + hold + acw) / seat capacity
}

/**
 * Erlang B recurrence:
 * B(0) = 1, B(n) = A * B(n-1) / (n + A * B(n-1))
 * Numerically stable for any A >= 0, integer n >= 0.
 */
export function erlangB(offeredLoadErlangs: number, seats: number): number {
  if (seats <= 0) return 1.0;
  if (offeredLoadErlangs <= 0) return 0.0;

  let b = 1.0;
  for (let i = 1; i <= seats; i++) {
    b = (offeredLoadErlangs * b) / (i + offeredLoadErlangs * b);
  }
  return b;
}

/**
 * Erlang C formula:
 * C(n, A) = (n * B(n, A)) / (n - A * (1 - B(n, A))) for n > A
 * If n <= A, system is unstable without abandonment; returns 1.0 (100% delay).
 */
export function erlangC(offeredLoadErlangs: number, seats: number): number {
  if (seats <= offeredLoadErlangs) return 1.0;
  if (offeredLoadErlangs <= 0) return 0.0;

  const b = erlangB(offeredLoadErlangs, seats);
  const denom = seats - offeredLoadErlangs * (1.0 - b);
  if (denom <= 0) return 1.0;
  const c = (seats * b) / denom;
  return Math.min(1.0, Math.max(0.0, c));
}

/**
 * Full Erlang C evaluation for given traffic and seats:
 * SL = 1 - C * exp(-(n - A) * T / AHT)
 * ASA = C * AHT / (n - A)
 */
export function evaluateErlangC(
  offeredLoadErlangs: number,
  seats: number,
  targetTimeSec: number,
  ahtSec: number
): ErlangResult {
  const b = erlangB(offeredLoadErlangs, seats);
  const c = erlangC(offeredLoadErlangs, seats);
  const occupancy = seats > 0 ? offeredLoadErlangs / seats : 1.0;

  if (seats <= offeredLoadErlangs) {
    return {
      offeredLoadErlangs,
      seats,
      erlangB: b,
      erlangC: 1.0,
      serviceLevel: 0.0,
      asaSec: 9999.0,
      occupancy: 1.0,
    };
  }

  const excess = seats - offeredLoadErlangs;
  const exponent = -(excess * targetTimeSec) / Math.max(1, ahtSec);
  const serviceLevel = Math.max(0.0, Math.min(1.0, 1.0 - c * Math.exp(exponent)));
  const asaSec = (c * ahtSec) / excess;

  return {
    offeredLoadErlangs,
    seats,
    erlangB: b,
    erlangC: c,
    serviceLevel,
    asaSec,
    occupancy: Math.min(1.0, occupancy),
  };
}

/**
 * Erlang A approximation (M/M/N + M with customer patience / abandonment)
 * Abandonment rate = 1 / mean patience.
 * Prevents explosive queues when traffic approaches or exceeds capacity.
 */
export function evaluateErlangA(
  offeredLoadErlangs: number,
  seats: number,
  targetTimeSec: number,
  ahtSec: number,
  meanPatienceSec: number
): ErlangResult {
  if (meanPatienceSec <= 0 || !isFinite(meanPatienceSec)) {
    return evaluateErlangC(offeredLoadErlangs, seats, targetTimeSec, ahtSec);
  }

  // Ratio of service rate to patience rate
  const mu = 1.0 / Math.max(1, ahtSec);
  const theta = 1.0 / meanPatienceSec;
  const gamma = theta / mu;

  // Approximate effective load accounting for customer abandonment
  const b = erlangB(offeredLoadErlangs, seats);
  const excess = seats - offeredLoadErlangs;

  if (excess > 0) {
    // Normal traffic with abandonment buffer
    const baseC = erlangC(offeredLoadErlangs, seats);
    const dampening = 1.0 / (1.0 + gamma * baseC);
    const c = baseC * dampening;
    const exponent = -(excess * targetTimeSec) / Math.max(1, ahtSec);
    const sl = 1.0 - c * Math.exp(exponent);
    const asa = (c * ahtSec) / (excess + gamma * offeredLoadErlangs);

    return {
      offeredLoadErlangs,
      seats,
      erlangB: b,
      erlangC: c,
      serviceLevel: Math.max(0, Math.min(1, sl)),
      asaSec: Math.max(0, asa),
      occupancy: Math.min(1.0, offeredLoadErlangs / Math.max(1, seats)),
    };
  } else {
    // Overloaded state where abandonment prevents infinite queue
    const overloadedDeficit = offeredLoadErlangs - seats;
    const probDelay = 1.0;
    const estWait = (overloadedDeficit / (seats * theta)) * ahtSec;
    const sl = Math.max(0.01, Math.exp(-targetTimeSec / Math.max(1, estWait)));
    return {
      offeredLoadErlangs,
      seats,
      erlangB: b,
      erlangC: probDelay,
      serviceLevel: sl,
      asaSec: Math.max(1, estWait),
      occupancy: 1.0,
    };
  }
}

/**
 * Section 7.1: phi_min derivation
 * The smallest fraction of offered contacts that the active horizon targets force to be answered.
 */
export function computePhiMin(
  targetAnswerRate: number,
  maxAbandonmentRate: number,
  targetSL1: number
): number {
  let phi = 0.0;
  if (targetAnswerRate > 0) {
    phi = Math.max(phi, targetAnswerRate);
  }
  if (maxAbandonmentRate > 0 && maxAbandonmentRate < 1) {
    phi = Math.max(phi, 1.0 - maxAbandonmentRate);
  }
  if (targetSL1 > 0) {
    phi = Math.max(phi, targetSL1);
  }
  return phi > 0 ? Math.min(1.0, phi) : 1.0;
}

/**
 * Section 7.1: Workload W (hours) and Rigorous seat-hours lower bound
 */
export function computeHorizonWorkloadHours(
  totalVolume: number,
  weightedAhtSec: number,
  productivityFactor: number = 1.0,
  openingWipHours: number = 0.0
): number {
  const pureWorkload = (totalVolume * weightedAhtSec * productivityFactor) / K.SECONDS_PER_HOUR;
  return pureWorkload + openingWipHours;
}

/**
 * Section 7.1 & Section 8.3:
 * Rigorous lower bound:
 * HC_rigorous = ceil(minimum_seat_hours_bound / M)
 * where M is maximum seat-hours one agent can supply over the horizon.
 */
export function computeRigorousHcBound(
  minSeatHoursBound: number,
  maxHoursPerAgentOverHorizon: number
): number {
  if (maxHoursPerAgentOverHorizon <= 0) return 1;
  return Math.ceil(minSeatHoursBound / maxHoursPerAgentOverHorizon);
}
