/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { StageNavigation } from './components/StageNavigation';
import { DataIngestionView } from './components/DataIngestionView';
import { ForecastView } from './components/ForecastView';
import { ConfigBlocksView } from './components/ConfigBlocksView';
import { ResultsView } from './components/ResultsView';
import { ModeBView } from './components/ModeBView';
import { ValidatorReportModal } from './components/ValidatorReportModal';
import { TestRunnerModal } from './components/TestRunnerModal';
import { ChallengerConsole } from './components/ChallengerConsole';
import { solveLayer1PureRequirement, solveLayer2Schedule } from './engine/optimizer';
import { validateScheduleIndependently } from './engine/validator';
import { validateConfigCompleteness } from './engine/completeness';
import {
  RunMode,
  Fidelity,
  StageId,
  StageStatus,
  QueueConfig,
  PoolConfig,
  RosterRuleConfig,
  ShrinkageConfig,
  IntervalForecastRecord,
  CleanedDatasetReport,
  ForecastRelease,
} from './types/wfm';
import { AlertCircle, Sparkles, Check } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState<RunMode>('MODE_A');
  const [fidelity, setFidelity] = useState<Fidelity>('CERTIFIED');
  const [currentStage, setCurrentStage] = useState<StageId>('S1');
  const [isCalculating, setIsCalculating] = useState(false);

  // Modals state
  const [isTestsModalOpen, setIsTestsModalOpen] = useState(false);
  const [isChallengerModalOpen, setIsChallengerModalOpen] = useState(false);
  const [isValidatorModalOpen, setIsValidatorModalOpen] = useState(false);

  // PRD N3: Initial dataset starts empty; loaded only through user upload or explicit "Load example dataset"
  const [forecastRecords, setForecastRecords] = useState<IntervalForecastRecord[]>([]);
  const [cleaningReport, setCleaningReport] = useState<CleanedDatasetReport | null>(null);
  const [forecastRelease, setForecastRelease] = useState<ForecastRelease | null>(null);

  // Stage statuses state machine
  const [stageStatuses, setStageStatuses] = useState<Record<StageId, StageStatus>>({
    S1: 'OPEN',
    S2: 'OPEN',
    S3: 'LOCKED',
    S4: 'LOCKED',
    S5: 'LOCKED',
    S6: 'LOCKED',
    S7: 'LOCKED',
    S8: 'LOCKED',
    S6B: 'LOCKED',
    S7B: 'LOCKED',
  });

  // PRD N3: All operational fields start empty (null or undefined)
  const [queueConfig, setQueueConfig] = useState<QueueConfig>({
    id: 'Voice_Primary',
    name: 'Voice Inbound Primary',
    queueClass: 'REAL_TIME',
    targetSL: null,
    targetSLTime: null,
    slType: 'SL1',
    targetASA: null,
    targetAnswerRate: null,
    maxAbandonmentRate: null,
    meanPatienceSec: null,
    patienceCV: null,
  });

  const [poolConfig, setPoolConfig] = useState<PoolConfig>({
    id: 'Voice_Pool_1',
    name: 'Dedicated Voice Agents',
    queueIds: ['Voice_Primary'],
    productivityFactor: null,
    minSeatsWhileOpen: null,
    hcSearchCeiling: null,
    occupancyCap: null,
  });

  // Schedule Block (Section 4.8) - starts empty
  const [rosterRules, setRosterRules] = useState<RosterRuleConfig>({
    allowedShiftStarts: [],
    allowedShiftLengths: [],
    breakCount: null,
    breakDurationMinutes: null,
    breakWindowStartHour: null,
    breakWindowEndHour: null,
    minBreakSeparationMinutes: null,
    breaksPaid: false,
    breaksCountTowardContract: false,
    weeklyOffDays: null,
    adjacentOffDaysRequired: true,
    maxConsecutiveWorkDays: null,
    minRestBetweenShiftsHours: null,
    minWeeklyHours: null,
    maxWeeklyHours: null,
    rosterCycleWeeks: null,
  });

  // Example tracking (PRD N3, 4.10)
  const [exampleFields, setExampleFields] = useState<Set<string>>(new Set());
  const [confirmedFields, setConfirmedFields] = useState<Set<string>>(new Set());

  // Shrinkage Block (Section 4.9 & 9)
  const [shrinkageConfig, setShrinkageConfig] = useState<ShrinkageConfig>({
    contractHoursPerWeek: 40,
    productiveHoursPerFTE: 32,
    components: [
      { id: '1', name: 'Annual & Sick Leave', rate: 0.08, base: 'TOTAL_TIME', alreadyInRoster: false },
      { id: '2', name: 'Training & Coaching', rate: 0.03, base: 'PAID_TIME', alreadyInRoster: false },
      { id: '3', name: 'Team Meetings & 1-on-1s', rate: 0.02, base: 'PAID_TIME', alreadyInRoster: false },
      { id: '4', name: 'Unplanned Adherence Loss', rate: 0.02, base: 'ON_DUTY_TIME', alreadyInRoster: false },
      { id: '5', name: 'Scheduled Shift Breaks', rate: 0.06, base: 'TOTAL_TIME', alreadyInRoster: true },
    ],
  });

  // Completeness & Blocking Calculation (PRD N3, 4.10)
  const completenessReport = useMemo(() => {
    return validateConfigCompleteness(queueConfig, poolConfig, rosterRules, exampleFields, confirmedFields);
  }, [queueConfig, poolConfig, rosterRules, exampleFields, confirmedFields]);

  // "Insert example" action (PRD N3)
  const handleInsertExample = () => {
    setQueueConfig({
      id: 'Voice_Primary',
      name: 'Voice Inbound Primary',
      queueClass: 'REAL_TIME',
      targetSL: 0.80,
      targetSLTime: 20,
      slType: 'SL1',
      targetASA: 30,
      targetAnswerRate: 0.95,
      maxAbandonmentRate: 0.05,
      meanPatienceSec: 180,
      patienceCV: 0.8,
    });

    setPoolConfig({
      id: 'Voice_Pool_1',
      name: 'Dedicated Voice Agents',
      queueIds: ['Voice_Primary'],
      productivityFactor: 1.0,
      minSeatsWhileOpen: 2,
      hcSearchCeiling: 60,
      occupancyCap: 0.88,
    });

    setRosterRules({
      allowedShiftStarts: ['07:00', '08:00', '09:00', '13:00', '14:00', '22:00'],
      allowedShiftLengths: [8],
      breakCount: 2,
      breakDurationMinutes: 30,
      breakWindowStartHour: 2,
      breakWindowEndHour: 2,
      minBreakSeparationMinutes: 90,
      breaksPaid: false,
      breaksCountTowardContract: false,
      weeklyOffDays: 2,
      adjacentOffDaysRequired: true,
      maxConsecutiveWorkDays: 5,
      minRestBetweenShiftsHours: 11,
      minWeeklyHours: 36,
      maxWeeklyHours: 40,
      rosterCycleWeeks: 1,
    });

    const fields = [
      'targetSL',
      'targetSLTime',
      'targetASA',
      'targetAnswerRate',
      'maxAbandonmentRate',
      'meanPatienceSec',
      'patienceCV',
      'productivityFactor',
      'minSeatsWhileOpen',
      'hcSearchCeiling',
      'allowedShiftStarts',
      'allowedShiftLengths',
      'breakCount',
      'breakDurationMinutes',
      'weeklyOffDays',
      'maxConsecutiveWorkDays',
      'minRestBetweenShiftsHours',
      'minWeeklyHours',
      'maxWeeklyHours',
    ];
    setExampleFields(new Set(fields));
    setConfirmedFields(new Set()); // all start unconfirmed, blocking the run
  };

  const handleConfirmExampleField = (fieldName: string) => {
    setConfirmedFields((prev) => new Set([...prev, fieldName]));
  };

  const handleConfirmAllExamples = () => {
    setConfirmedFields(new Set(exampleFields));
  };

  // Sizing and Scheduling Engine Execution (strictly blocked if incomplete or unconfirmed)
  const isEngineRunAllowed = !completenessReport.isBlocked && forecastRecords.length > 0;

  const layer1Result = useMemo(() => {
    if (!isEngineRunAllowed) return null;
    try {
      return solveLayer1PureRequirement(
        forecastRecords,
        queueConfig,
        poolConfig,
        shrinkageConfig.contractHoursPerWeek,
        1
      );
    } catch {
      return null;
    }
  }, [isEngineRunAllowed, forecastRecords, queueConfig, poolConfig, shrinkageConfig.contractHoursPerWeek]);

  const layer2Result = useMemo(() => {
    if (!isEngineRunAllowed || !layer1Result) return null;
    try {
      return solveLayer2Schedule(
        layer1Result,
        forecastRecords,
        rosterRules,
        queueConfig,
        poolConfig,
        fidelity,
        42
      );
    } catch {
      return null;
    }
  }, [isEngineRunAllowed, layer1Result, forecastRecords, rosterRules, queueConfig, poolConfig, fidelity]);

  // Independent Schedule Validator
  const validatorReport = useMemo(() => {
    if (!layer2Result) {
      return {
        passedHardRules: true,
        totalViolations: 0,
        hardViolationsCount: 0,
        findingsCount: 0,
        violations: [],
        recalculatedKpis: {
          totalOffered: 0,
          totalAnswered: 0,
          totalAbandoned: 0,
          overallSL: 0,
          overallASA: 0,
          overallOccupancy: 0,
          conservationVerified: true,
        },
      };
    }
    return validateScheduleIndependently(
      layer2Result.rosterSchedules,
      rosterRules,
      poolConfig.minSeatsWhileOpen ?? 1
    );
  }, [layer2Result, rosterRules, poolConfig.minSeatsWhileOpen]);

  const handleRecalculate = () => {
    if (!isEngineRunAllowed) {
      setCurrentStage('S4');
      return;
    }
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      setCurrentStage(mode === 'MODE_A' ? 'S8' : 'S7B');
    }, 200);
  };

  const handleDatasetConfirmed = (records: IntervalForecastRecord[], report: CleanedDatasetReport) => {
    setForecastRecords(records);
    setCleaningReport(report);
    setCurrentStage('S3');
    setStageStatuses((prev) => ({ ...prev, S1: 'DONE', S2: 'DONE', S3: 'OPEN' }));
  };

  const handleReleaseLocked = (release: ForecastRelease) => {
    setForecastRelease(release);
    setCurrentStage('S4');
    setStageStatuses((prev) => ({ ...prev, S3: 'DONE', S4: 'OPEN' }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Header */}
      <Header
        mode={mode}
        setMode={(m) => {
          setMode(m);
          setCurrentStage(m === 'MODE_A' ? 'S8' : 'S7B');
        }}
        fidelity={fidelity}
        setFidelity={setFidelity}
        onOpenTests={() => setIsTestsModalOpen(true)}
        onOpenChallenger={() => setIsChallengerModalOpen(true)}
        onRecalculate={handleRecalculate}
        isCalculating={isCalculating}
      />

      {/* Stage Stepper FSM */}
      <StageNavigation
        currentStage={currentStage}
        onSelectStage={(s) => setCurrentStage(s)}
        stageStatuses={stageStatuses}
        mode={mode}
      />

      {/* Main Workspace Stage View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {(currentStage === 'S1' || currentStage === 'S2') && (
          <DataIngestionView
            onDatasetConfirmed={handleDatasetConfirmed}
            existingReport={cleaningReport || undefined}
            existingRecords={forecastRecords}
          />
        )}

        {currentStage === 'S3' && (
          <ForecastView
            userRecords={forecastRecords}
            onReleaseLocked={handleReleaseLocked}
            existingRelease={forecastRelease || undefined}
          />
        )}

        {currentStage === 'S4' && (
          <ConfigBlocksView
            queueConfig={queueConfig}
            setQueueConfig={setQueueConfig}
            poolConfig={poolConfig}
            setPoolConfig={setPoolConfig}
            rosterRules={rosterRules}
            setRosterRules={setRosterRules}
            shrinkageConfig={shrinkageConfig}
            setShrinkageConfig={setShrinkageConfig}
            completenessReport={completenessReport}
            onInsertExample={handleInsertExample}
            onConfirmExampleField={handleConfirmExampleField}
            onConfirmAllExamples={handleConfirmAllExamples}
            onConfirmAndRunSizing={() => {
              if (isEngineRunAllowed) {
                setStageStatuses((prev) => ({
                  ...prev,
                  S4: 'DONE',
                  S5: 'DONE',
                  S6: 'DONE',
                  S7: 'DONE',
                  S8: 'DONE',
                  S6B: 'DONE',
                  S7B: 'DONE',
                }));
                setCurrentStage(mode === 'MODE_A' ? 'S8' : 'S7B');
              }
            }}
          />
        )}

        {currentStage === 'S5' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
            <h3 className="text-xl font-bold text-white">Stage 5: Quick Erlang Estimate</h3>
            {layer1Result ? (
              <p className="text-sm text-slate-400 max-w-xl mx-auto">
                Analytical Erlang A/C floor calculated. Pure seat-hours: {layer1Result.pureSeatHours.toFixed(1)}h.
              </p>
            ) : (
              <p className="text-sm text-amber-400 max-w-xl mx-auto">
                Configuration incomplete. Please complete all required fields in Stage 4.
              </p>
            )}
            <button
              onClick={() => setCurrentStage(mode === 'MODE_A' ? 'S8' : 'S7B')}
              disabled={!isEngineRunAllowed}
              className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white px-5 py-2 rounded-lg text-xs font-bold transition shadow"
            >
              View Full Results
            </button>
          </div>
        )}

        {(currentStage === 'S6' || currentStage === 'S7' || currentStage === 'S8') && mode === 'MODE_A' && (
          <>
            {!isEngineRunAllowed || !layer1Result || !layer2Result ? (
              <div className="bg-slate-900 border border-amber-800/80 rounded-xl p-8 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
                <h3 className="text-xl font-bold text-white">Sizing Run Blocked (PRD N3 & 4.10 Policy)</h3>
                <p className="text-sm text-slate-400 max-w-xl mx-auto">
                  {forecastRecords.length === 0
                    ? 'No forecast dataset loaded. Please upload or load an FCT dataset in Stage 1.'
                    : `Operational parameters are incomplete or unconfirmed: ${completenessReport.missingRequiredFields.length} unfilled fields, ${completenessReport.unconfirmedExampleFields.length} unconfirmed examples.`}
                </p>
                <div className="flex justify-center gap-3">
                  {forecastRecords.length === 0 && (
                    <button
                      onClick={() => setCurrentStage('S1')}
                      className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg text-xs font-bold"
                    >
                      Go to Stage 1 (Upload FCT)
                    </button>
                  )}
                  {completenessReport.isBlocked && (
                    <button
                      onClick={() => setCurrentStage('S4')}
                      className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-xs font-bold"
                    >
                      Go to Stage 4 (Configure Parameters)
                    </button>
                  )}
                  {completenessReport.unconfirmedExampleFields.length > 0 && (
                    <button
                      onClick={handleConfirmAllExamples}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Confirm All Examples
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <ResultsView
                layer1={layer1Result}
                layer2={layer2Result}
                shrinkageConfig={shrinkageConfig}
                fidelity={fidelity}
                onOpenValidatorModal={() => setIsValidatorModalOpen(true)}
              />
            )}
          </>
        )}

        {(currentStage === 'S6B' || currentStage === 'S7B') && mode === 'MODE_B' && (
          <>
            {!isEngineRunAllowed || !layer2Result ? (
              <div className="bg-slate-900 border border-amber-800/80 rounded-xl p-8 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
                <h3 className="text-xl font-bold text-white">Fixed HC Evaluation Blocked</h3>
                <p className="text-sm text-slate-400 max-w-xl mx-auto">
                  Please complete and confirm all required configuration fields in Stage 4 before running evaluation.
                </p>
                <button
                  onClick={() => setCurrentStage('S4')}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-xs font-bold"
                >
                  Go to Stage 4
                </button>
              </div>
            ) : (
              <ModeBView
                intervals={forecastRecords}
                queueConfig={queueConfig}
                poolConfig={poolConfig}
                rosterRules={rosterRules}
                fidelity={fidelity}
                minHcSizingResult={layer2Result.rosterHc}
                onOpenValidatorModal={() => setIsValidatorModalOpen(true)}
                onSwitchToModeA={() => {
                  setMode('MODE_A');
                  setCurrentStage('S8');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <ValidatorReportModal
        isOpen={isValidatorModalOpen}
        onClose={() => setIsValidatorModalOpen(false)}
        report={validatorReport}
      />

      <TestRunnerModal
        isOpen={isTestsModalOpen}
        onClose={() => setIsTestsModalOpen(false)}
      />

      <ChallengerConsole
        isOpen={isChallengerModalOpen}
        onClose={() => setIsChallengerModalOpen(false)}
      />
    </div>
  );
}
