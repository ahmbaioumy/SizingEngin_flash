/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PRD v7.1 Discrete Event Simulation (DES) Core
 * Section 7.4 DES Core, Section 7.5 Real-time Mechanics, Section 7.6 Deferrable
 * Pure function of (demand, seat schedule, configs, seeds).
 * Priority-queue event calendar, Little's Law & Conservation verified.
 */

import { K } from './constants';
import { KeyedPRNG } from './prng';
import { QueueConfig, PoolConfig, IntervalForecastRecord } from '../types/wfm';

export type EventType =
  | 'ARRIVAL'
  | 'ABANDONMENT'
  | 'SERVICE_COMPLETION'
  | 'SHIFT_CHANGE';

export interface DesEvent {
  timeSec: number;
  type: EventType;
  priorityOrder: number; // tie-breaking
  entityId: number;
  queueId: string;
  data?: any;
}

export interface DesContact {
  id: number;
  queueId: string;
  arrivalTimeSec: number;
  serviceDurationSec: number;
  patienceSec: number;
  abandonTimeSec: number;
  assignedTimeSec: number;
  completionTimeSec: number;
  answeredWithinTarget: boolean;
  abandoned: boolean;
  shortAbandon: boolean;
}

export interface SimulationReplicationResult {
  replicationIndex: number;
  totalOffered: number;
  totalAnswered: number;
  totalAbandoned: number;
  totalShortAbandoned: number;
  answeredWithinTarget: number;
  sl1: number; // answered within T / offered
  sl2: number; // answered within T / (offered - shortAbn)
  sl3: number; // answered within T / answered
  asaSec: number;
  answerRate: number;
  abandonmentRate: number;
  occupancy: number; // workload occupancy
  totalWorkloadSec: number;
  totalSeatAvailableSec: number;
  littlesLawDiscrepancy: number;
  conservationVerified: boolean;
}

/**
 * Binary min-heap priority queue for simulation events
 */
class EventCalendar {
  private heap: DesEvent[] = [];

  public get size(): number {
    return this.heap.length;
  }

  public push(event: DesEvent): void {
    this.heap.push(event);
    this.bubbleUp(this.heap.length - 1);
  }

  public pop(): DesEvent | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.bubbleDown(0);
    }
    return top;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIdx = (index - 1) >> 1;
      if (this.compare(this.heap[index], this.heap[parentIdx]) < 0) {
        const temp = this.heap[index];
        this.heap[index] = this.heap[parentIdx];
        this.heap[parentIdx] = temp;
        index = parentIdx;
      } else {
        break;
      }
    }
  }

  private bubbleDown(index: number): void {
    const len = this.heap.length;
    while (true) {
      let smallest = index;
      const left = (index << 1) + 1;
      const right = left + 1;

      if (left < len && this.compare(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < len && this.compare(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }
      if (smallest !== index) {
        const temp = this.heap[index];
        this.heap[index] = this.heap[smallest];
        this.heap[smallest] = temp;
        index = smallest;
      } else {
        break;
      }
    }
  }

  private compare(a: DesEvent, b: DesEvent): number {
    if (Math.abs(a.timeSec - b.timeSec) > 1e-9) {
      return a.timeSec - b.timeSec;
    }
    if (a.priorityOrder !== b.priorityOrder) {
      return a.priorityOrder - b.priorityOrder;
    }
    return a.entityId - b.entityId;
  }
}

/**
 * Runs a single full-horizon simulation replication for given seat curve or roster
 */
export function simulateReplication(
  intervals: IntervalForecastRecord[],
  seatCurve: number[], // seats per interval
  queueConfig: QueueConfig,
  poolConfig: PoolConfig,
  seedBlock: number,
  replicationIndex: number
): SimulationReplicationResult {
  const prng = new KeyedPRNG(seedBlock, replicationIndex, 100);
  const calendar = new EventCalendar();

  const intervalSec = (intervals[0]?.intervalMinutes || 30) * K.SECONDS_PER_MINUTE;
  const totalIntervals = intervals.length;
  const horizonDurationSec = totalIntervals * intervalSec;

  // 1. Generate demand contacts across intervals (G1 carry-forward reconciled)
  const contacts: DesContact[] = [];
  let contactSeq = 0;
  let totalOffered = 0;

  for (let i = 0; i < totalIntervals; i++) {
    const fct = intervals[i];
    const intervalStartSec = i * intervalSec;
    const count = Math.round(fct.volume); // G1 integer count
    totalOffered += count;

    for (let c = 0; c < count; c++) {
      contactSeq++;
      // Keyed uniform arrival inside interval
      const uArr = prng.nextUniform();
      const arrivalTimeSec = intervalStartSec + uArr * intervalSec;

      // Realized service time (lognormal around fct.ahtSec * productivity)
      const meanAht = fct.ahtSec * (poolConfig.productivityFactor ?? 1.0);
      const cv = queueConfig.patienceCV ?? 0.6;
      const serviceDurationSec = Math.max(1.0, prng.nextLognormal(meanAht, cv));

      // Customer patience (exponential variate)
      const patienceSec = prng.nextExponential(1.0 / Math.max(10, queueConfig.meanPatienceSec ?? 180));
      const abandonTimeSec = arrivalTimeSec + patienceSec;

      const contact: DesContact = {
        id: contactSeq,
        queueId: queueConfig.id,
        arrivalTimeSec,
        serviceDurationSec,
        patienceSec,
        abandonTimeSec,
        assignedTimeSec: -1,
        completionTimeSec: -1,
        answeredWithinTarget: false,
        abandoned: false,
        shortAbandon: false,
      };

      contacts.push(contact);

      calendar.push({
        timeSec: arrivalTimeSec,
        type: 'ARRIVAL',
        priorityOrder: 1,
        entityId: contact.id,
        queueId: queueConfig.id,
        data: contact,
      });
    }
  }

  // 2. Schedule interval seat changes
  for (let i = 0; i < totalIntervals; i++) {
    calendar.push({
      timeSec: i * intervalSec,
      type: 'SHIFT_CHANGE',
      priorityOrder: 0,
      entityId: i,
      queueId: queueConfig.id,
      data: { intervalIdx: i, seats: seatCurve[i] ?? poolConfig.minSeatsWhileOpen },
    });
  }

  // State trackers
  let currentSeats = seatCurve[0] ?? poolConfig.minSeatsWhileOpen;
  let activeInService = 0;
  const waitingQueue: DesContact[] = [];
  const activeContactsMap = new Map<number, DesContact>();

  // Statistics accumulators
  let totalAnswered = 0;
  let totalAbandoned = 0;
  let totalShortAbandoned = 0;
  let answeredWithinTarget = 0;
  let totalWaitTimeSec = 0;
  let totalWorkloadSec = 0;

  // Little's Law verification accumulators:
  // L(t) = queue_length(t) + in_service(t)
  let lastEventTime = 0.0;
  let queueArea = 0.0;
  let systemArea = 0.0;

  // Short abandon threshold (e.g. 5 seconds)
  const shortAbandonThresholdSec = 5.0;

  // 3. Main event loop
  while (calendar.size > 0) {
    const event = calendar.pop()!;
    const simTime = event.timeSec;

    // Advance Little's Law integrals
    const dt = Math.max(0.0, simTime - lastEventTime);
    queueArea += waitingQueue.length * dt;
    systemArea += (waitingQueue.length + activeInService) * dt;
    lastEventTime = simTime;

    if (simTime > horizonDurationSec + 3600) {
      // Drain window reached
      break;
    }

    switch (event.type) {
      case 'SHIFT_CHANGE': {
        const nextSeats = event.data.seats;
        currentSeats = Math.max(poolConfig.minSeatsWhileOpen ?? 1, nextSeats);
        // If new seats became available, dispatch waiting contacts
        while (waitingQueue.length > 0 && activeInService < currentSeats) {
          const contact = waitingQueue.shift()!;
          dispatchContact(contact, simTime);
        }
        break;
      }

      case 'ARRIVAL': {
        const contact = event.data as DesContact;
        if (activeInService < currentSeats) {
          // Immediate dispatch
          dispatchContact(contact, simTime);
        } else {
          // Put in waiting queue and schedule potential abandonment
          waitingQueue.push(contact);
          calendar.push({
            timeSec: contact.abandonTimeSec,
            type: 'ABANDONMENT',
            priorityOrder: 2,
            entityId: contact.id,
            queueId: queueConfig.id,
          });
        }
        break;
      }

      case 'ABANDONMENT': {
        const contactId = event.entityId;
        // Check if still in waiting queue
        const idx = waitingQueue.findIndex((c) => c.id === contactId);
        if (idx !== -1) {
          const contact = waitingQueue.splice(idx, 1)[0];
          contact.abandoned = true;
          totalAbandoned++;
          const waitTime = simTime - contact.arrivalTimeSec;
          if (waitTime <= shortAbandonThresholdSec) {
            contact.shortAbandon = true;
            totalShortAbandoned++;
          }
        }
        break;
      }

      case 'SERVICE_COMPLETION': {
        const contactId = event.entityId;
        if (activeContactsMap.has(contactId)) {
          const contact = activeContactsMap.get(contactId)!;
          activeContactsMap.delete(contactId);
          activeInService = Math.max(0, activeInService - 1);

          totalWorkloadSec += contact.serviceDurationSec;

          // Dispatch next waiting contact if seats available
          if (waitingQueue.length > 0 && activeInService < currentSeats) {
            const nextContact = waitingQueue.shift()!;
            dispatchContact(nextContact, simTime);
          }
        }
        break;
      }
    }
  }

  function dispatchContact(contact: DesContact, atTime: number) {
    contact.assignedTimeSec = atTime;
    const waitTime = atTime - contact.arrivalTimeSec;
    totalWaitTimeSec += waitTime;
    totalAnswered++;

    if (waitTime <= (queueConfig.targetSLTime ?? 20)) {
      contact.answeredWithinTarget = true;
      answeredWithinTarget++;
    }

    activeInService++;
    activeContactsMap.set(contact.id, contact);

    contact.completionTimeSec = atTime + contact.serviceDurationSec;
    calendar.push({
      timeSec: contact.completionTimeSec,
      type: 'SERVICE_COMPLETION',
      priorityOrder: 3,
      entityId: contact.id,
      queueId: queueConfig.id,
    });
  }

  // 4. Compute Replication Horizon Metrics
  const effectiveOffered = Math.max(1, totalOffered);
  const sl1 = answeredWithinTarget / effectiveOffered;
  const denomSl2 = Math.max(1, totalOffered - totalShortAbandoned);
  const sl2 = answeredWithinTarget / denomSl2;
  const sl3 = totalAnswered > 0 ? answeredWithinTarget / totalAnswered : 0.0;
  const asaSec = totalAnswered > 0 ? totalWaitTimeSec / totalAnswered : 0.0;
  const answerRate = totalAnswered / effectiveOffered;
  const abandonmentRate = totalAbandoned / effectiveOffered;

  // Occupancy = total workload seconds / total seat capacity seconds
  let totalSeatAvailableSec = 0;
  for (let i = 0; i < totalIntervals; i++) {
    totalSeatAvailableSec += (seatCurve[i] ?? (poolConfig.minSeatsWhileOpen ?? 1)) * intervalSec;
  }
  const occupancy = totalSeatAvailableSec > 0 ? totalWorkloadSec / totalSeatAvailableSec : 0.0;

  // Conservation check: offered == answered + abandoned + remaining in queue / service
  const remainingInSystem = waitingQueue.length + activeInService;
  const conservationVerified = (totalAnswered + totalAbandoned + remainingInSystem) === totalOffered;

  // Little's Law check: Average in system (systemArea / horizonDurationSec) vs throughput * avg time
  const throughput = (totalAnswered + totalAbandoned) / Math.max(1, horizonDurationSec);
  const avgTimeInSystem = totalOffered > 0 ? (totalWaitTimeSec + totalWorkloadSec) / totalOffered : 0;
  const expectedSystemL = throughput * avgTimeInSystem;
  const simulatedSystemL = systemArea / Math.max(1, horizonDurationSec);
  const littlesLawDiscrepancy = Math.abs(simulatedSystemL - expectedSystemL) / Math.max(0.1, simulatedSystemL);

  return {
    replicationIndex,
    totalOffered,
    totalAnswered,
    totalAbandoned,
    totalShortAbandoned,
    answeredWithinTarget,
    sl1,
    sl2,
    sl3,
    asaSec,
    answerRate,
    abandonmentRate,
    occupancy: Math.min(1.0, occupancy),
    totalWorkloadSec,
    totalSeatAvailableSec,
    littlesLawDiscrepancy,
    conservationVerified,
  };
}
