/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PRD N3, 4.10 No Defaults & Completeness Verification
 * Enforces that:
 * 1. Required operational fields start empty (null/undefined).
 * 2. Runs are BLOCKED if any required field is empty.
 * 3. Runs are BLOCKED if any field is filled from an unconfirmed example.
 * 4. Run unblocks only when all required fields are confirmed or replaced.
 */

import { QueueConfig, PoolConfig, RosterRuleConfig, ConfigCompletenessReport } from '../types/wfm';

export function validateConfigCompleteness(
  queueConfig: QueueConfig,
  poolConfig: PoolConfig,
  rosterRules: RosterRuleConfig,
  exampleFields: Set<string>,
  confirmedFields: Set<string>
): ConfigCompletenessReport {
  const missingRequiredFields: string[] = [];
  const unconfirmedExampleFields: string[] = [];

  const checkField = (name: string, value: any) => {
    if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
      missingRequiredFields.push(name);
    } else if (exampleFields.has(name) && !confirmedFields.has(name)) {
      unconfirmedExampleFields.push(name);
    }
  };

  // 1. Business Block Fields
  checkField('targetSL', queueConfig.targetSL);
  checkField('targetSLTime', queueConfig.targetSLTime);
  checkField('targetASA', queueConfig.targetASA);
  checkField('targetAnswerRate', queueConfig.targetAnswerRate);
  checkField('maxAbandonmentRate', queueConfig.maxAbandonmentRate);
  checkField('meanPatienceSec', queueConfig.meanPatienceSec);
  checkField('patienceCV', queueConfig.patienceCV);
  checkField('productivityFactor', poolConfig.productivityFactor);
  checkField('minSeatsWhileOpen', poolConfig.minSeatsWhileOpen);
  checkField('hcSearchCeiling', poolConfig.hcSearchCeiling);

  // 2. Schedule Block Fields
  checkField('allowedShiftStarts', rosterRules.allowedShiftStarts);
  checkField('allowedShiftLengths', rosterRules.allowedShiftLengths);
  checkField('breakCount', rosterRules.breakCount);
  checkField('breakDurationMinutes', rosterRules.breakDurationMinutes);
  checkField('weeklyOffDays', rosterRules.weeklyOffDays);
  checkField('maxConsecutiveWorkDays', rosterRules.maxConsecutiveWorkDays);
  checkField('minRestBetweenShiftsHours', rosterRules.minRestBetweenShiftsHours);
  checkField('minWeeklyHours', rosterRules.minWeeklyHours);
  checkField('maxWeeklyHours', rosterRules.maxWeeklyHours);

  const isBlocked = missingRequiredFields.length > 0 || unconfirmedExampleFields.length > 0;
  const allFieldsConfirmed = !isBlocked;

  return {
    isBlocked,
    missingRequiredFields,
    unconfirmedExampleFields,
    allFieldsConfirmed,
  };
}
