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
import { generateRealisticVoiceFct } from './engine/sampleData';
import { cleanForecastDataset, proposeColumnMapping } from './engine/cleaner';
import { solveLayer1PureRequirement, solveLayer2Schedule } from './engine/optimizer';
import { validateScheduleIndependently } from './engine/validator';
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

export default function App() {
  const [mode, setMode] = useState<RunMode>('MODE_A');
  const [fidelity, setFidelity] = useState<Fidelity>('CERTIFIED');
  const [currentStage, setCurrentStage] = useState<StageId>('S8');
  const [isCalculating, setIsCalculating] = useState(false);

  // Modals state
  const [isTestsModalOpen, setIsTestsModalOpen] = useState(false);
  const [isChallengerModalOpen, setIsChallengerModalOpen] = useState(false);
  const [isValidatorModalOpen, setIsValidatorModalOpen] = useState(false);

  // Initial Sample Dataset
  const [forecastRecords, setForecastRecords] = useState<IntervalForecastRecord[]>(() =>
    generateRealisticVoiceFct()
  );
  const [cleaningReport, setCleaningReport] = useState<CleanedDatasetReport | null>(null);
  const [forecastRelease, setForecastRelease] = useState<ForecastRelease | null>(null);

  // Stage statuses state machine
  const [stageStatuses, setStageStatuses] = useState<Record<StageId, StageStatus>>({
    S1: 'DONE',
    S2: 'DONE',
    S3: 'DONE',
    S4: 'DONE',
    S5: 'DONE',
    S6: 'DONE',
    S7: 'DONE',
    S8: 'DONE',
    S6B: 'DONE',
    S7B: 'DONE',
  });

  // Business Block
  const [queueConfig, setQueueConfig] = useState<QueueConfig>({
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

  const [poolConfig, setPoolConfig] = useState<PoolConfig>({
    id: 'Voice_Pool_1',
    name: 'Dedicated Voice Agents',
    queueIds: ['Voice_Primary'],
    productivityFactor: 1.0,
    minSeatsWhileOpen: 2,
    hcSearchCeiling: 60,
    occupancyCap: 0.88,
  });

  // Schedule Block (Section 4.8)
  const [rosterRules, setRosterRules] = useState<RosterRuleConfig>({
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

  // Shrinkage Block (Section 4.9 & 9)
  const [shrinkageConfig, setShrinkageConfig] = useState<ShrinkageConfig>({
    contractHoursPerWeek: 40,
    productiveHoursPerFTE: 32,
    components: [
      { id: '1', name: 'Annual & Sick Leave', rate: 0.08, base: 'TOTAL_TIME', alreadyInRoster: false },
      { id: '2', name: 'Training & Coaching', rate: 0.03, base: 'PAID_TIME', alreadyInRoster: false },
      { id: '3', name: 'Team Meetings & 1-on-1s', rate: 0.02, base: 'PAID_TIME', alreadyInRoster: false },
      { id: '4', name: 'Unplanned Adherence Loss', rate: 0.02, base: 'ON_DUTY_TIME', alreadyInRoster: false },
      { id: '5', name: 'Scheduled Shift Breaks', rate: 0.06, base: 'TOTAL_TIME', alreadyInRoster: true }, // Excluded in grossing
    ],
  });

  // Sizing and Scheduling Engine Execution
  const layer1Result = useMemo(() => {
    return solveLayer1PureRequirement(forecastRecords, queueConfig, poolConfig, shrinkageConfig.contractHoursPerWeek, 1);
  }, [forecastRecords, queueConfig, poolConfig, shrinkageConfig.contractHoursPerWeek]);

  const layer2Result = useMemo(() => {
    return solveLayer2Schedule(
      layer1Result,
      forecastRecords,
      rosterRules,
      queueConfig,
      poolConfig,
      fidelity,
      42
    );
  }, [layer1Result, forecastRecords, rosterRules, queueConfig, poolConfig, fidelity]);

  // Independent Schedule Validator
  const validatorReport = useMemo(() => {
    return validateScheduleIndependently(layer2Result.rosterSchedules, rosterRules, poolConfig.minSeatsWhileOpen);
  }, [layer2Result, rosterRules, poolConfig.minSeatsWhileOpen]);

  const handleRecalculate = () => {
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
    setStageStatuses((prev) => ({ ...prev, S1: 'DONE', S2: 'DONE' }));
  };

  const handleReleaseLocked = (release: ForecastRelease) => {
    setForecastRelease(release);
    setCurrentStage('S4');
    setStageStatuses((prev) => ({ ...prev, S3: 'DONE' }));
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
            onConfirmAndRunSizing={() => setCurrentStage(mode === 'MODE_A' ? 'S8' : 'S7B')}
          />
        )}

        {currentStage === 'S5' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
            <h3 className="text-xl font-bold text-white">Stage 5: Quick Erlang Estimate</h3>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Analytical Erlang A/C floor calculated over 336 intervals. Pure seat-hours: {layer1Result.pureSeatHours.toFixed(1)}h.
            </p>
            <button
              onClick={() => setCurrentStage('S8')}
              className="bg-sky-600 hover:bg-sky-500 text-white px-5 py-2 rounded-lg text-xs font-bold transition shadow"
            >
              View Full Mode A Bridge (S8)
            </button>
          </div>
        )}

        {(currentStage === 'S6' || currentStage === 'S7' || currentStage === 'S8') && mode === 'MODE_A' && (
          <ResultsView
            layer1={layer1Result}
            layer2={layer2Result}
            shrinkageConfig={shrinkageConfig}
            fidelity={fidelity}
            onOpenValidatorModal={() => setIsValidatorModalOpen(true)}
          />
        )}

        {(currentStage === 'S6B' || currentStage === 'S7B') && mode === 'MODE_B' && (
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
