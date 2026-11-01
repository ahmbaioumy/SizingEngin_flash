/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Settings, Clock, Calendar, PieChart, Shield, ArrowRight, Plus, Trash2, AlertCircle, CheckCircle2, Sparkles, Check } from 'lucide-react';
import { QueueConfig, PoolConfig, RosterRuleConfig, ShrinkageConfig, ConfigCompletenessReport } from '../types/wfm';
import { CONSTANTS_REGISTER } from '../engine/constants';

interface ConfigBlocksViewProps {
  queueConfig: QueueConfig;
  setQueueConfig: (q: QueueConfig) => void;
  poolConfig: PoolConfig;
  setPoolConfig: (p: PoolConfig) => void;
  rosterRules: RosterRuleConfig;
  setRosterRules: (r: RosterRuleConfig) => void;
  shrinkageConfig: ShrinkageConfig;
  setShrinkageConfig: (s: ShrinkageConfig) => void;
  completenessReport: ConfigCompletenessReport;
  onInsertExample: () => void;
  onConfirmExampleField: (fieldName: string) => void;
  onConfirmAllExamples: () => void;
  onConfirmAndRunSizing: () => void;
}

export const ConfigBlocksView: React.FC<ConfigBlocksViewProps> = ({
  queueConfig,
  setQueueConfig,
  poolConfig,
  setPoolConfig,
  rosterRules,
  setRosterRules,
  shrinkageConfig,
  setShrinkageConfig,
  completenessReport,
  onInsertExample,
  onConfirmExampleField,
  onConfirmAllExamples,
  onConfirmAndRunSizing,
}) => {
  const [activeTab, setActiveTab] = useState<'BUSINESS' | 'SCHEDULE' | 'SHRINKAGE' | 'CONSTANTS'>('BUSINESS');
  const [newStartTime, setNewStartTime] = useState('');

  const handleAddStartTime = () => {
    if (newStartTime && !rosterRules.allowedShiftStarts.includes(newStartTime)) {
      setRosterRules({
        ...rosterRules,
        allowedShiftStarts: [...rosterRules.allowedShiftStarts, newStartTime].sort(),
      });
      setNewStartTime('');
    }
  };

  const handleRemoveStartTime = (time: string) => {
    setRosterRules({
      ...rosterRules,
      allowedShiftStarts: rosterRules.allowedShiftStarts.filter((t) => t !== time),
    });
  };

  const renderFieldStatus = (fieldName: string, label: string) => {
    const isUnconfirmed = completenessReport.unconfirmedExampleFields.includes(fieldName);
    const isMissing = completenessReport.missingRequiredFields.includes(fieldName);

    return (
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-slate-300">{label}</label>
        {isUnconfirmed && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded font-mono font-bold">
              EXAMPLE
            </span>
            <button
              onClick={() => onConfirmExampleField(fieldName)}
              className="text-[10px] bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5"
            >
              <Check className="w-2.5 h-2.5" /> Confirm
            </button>
          </div>
        )}
        {isMissing && (
          <span className="text-[10px] text-red-400 font-semibold font-mono">
            * REQUIRED (EMPTY)
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-sky-400" />
              Stage 4: Configuration Blocks (Section 3.4 & 4.8)
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              PRD N3: Zero default operational values. Fields start empty. "Insert example" marks fields as example until confirmed.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onInsertExample}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-700/60 px-3.5 py-2 rounded-lg text-xs font-semibold transition"
              title="Fill fields with benchmark example values marked example=true (PRD N3)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Insert example</span>
            </button>

            {completenessReport.unconfirmedExampleFields.length > 0 && (
              <button
                onClick={onConfirmAllExamples}
                className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm All Examples</span>
              </button>
            )}

            <button
              onClick={onConfirmAndRunSizing}
              disabled={completenessReport.isBlocked}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold shadow-md transition ${
                completenessReport.isBlocked
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-sky-600 hover:bg-sky-500 text-white'
              }`}
            >
              <span>Proceed to Sizing & Scheduling</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Completeness / Blocking Alert Banner */}
        {completenessReport.isBlocked ? (
          <div className="mt-4 p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-xs text-amber-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-amber-300 text-sm">
                Run BLOCKED (PRD N3 & 4.10 Policy)
              </div>
              <p>
                Execution is blocked until all required operational fields are filled and all example values are confirmed or replaced.
              </p>
              {completenessReport.missingRequiredFields.length > 0 && (
                <div className="text-[11px] text-amber-300/90">
                  <strong>Unfilled Required Fields ({completenessReport.missingRequiredFields.length}): </strong>
                  <span className="font-mono">{completenessReport.missingRequiredFields.join(', ')}</span>
                </div>
              )}
              {completenessReport.unconfirmedExampleFields.length > 0 && (
                <div className="text-[11px] text-amber-400">
                  <strong>Unconfirmed Example Values ({completenessReport.unconfirmedExampleFields.length}): </strong>
                  <span className="font-mono">{completenessReport.unconfirmedExampleFields.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>All required operational fields are confirmed. Sizing run is unblocked.</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex gap-2 mt-6 border-b border-slate-800 pb-2">
          {[
            { id: 'BUSINESS', label: '1. Business Block (Targets & SLA)', icon: Clock },
            { id: 'SCHEDULE', label: '2. Schedule Block (Roster Rules)', icon: Calendar },
            { id: 'SHRINKAGE', label: '3. Shrinkage Block (Grossing)', icon: PieChart },
            { id: 'CONSTANTS', label: 'Constants Register (Class K)', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-slate-800 text-sky-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: BUSINESS BLOCK */}
      {activeTab === 'BUSINESS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-white mb-4">Queue SLA & Performance Targets</h3>
            <div className="space-y-4">
              <div>
                {renderFieldStatus('targetSL', 'Service Level Target (SL1 fraction, e.g. 0.80)')}
                <input
                  type="number"
                  step="0.05"
                  min="0.5"
                  max="1.0"
                  placeholder="e.g. 0.80"
                  value={queueConfig.targetSL ?? ''}
                  onChange={(e) =>
                    setQueueConfig({ ...queueConfig, targetSL: e.target.value === '' ? null : parseFloat(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                />
              </div>

              <div>
                {renderFieldStatus('targetSLTime', 'Target Threshold Time (Seconds)')}
                <input
                  type="number"
                  placeholder="e.g. 20"
                  value={queueConfig.targetSLTime ?? ''}
                  onChange={(e) =>
                    setQueueConfig({ ...queueConfig, targetSLTime: e.target.value === '' ? null : parseInt(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                />
              </div>

              <div>
                {renderFieldStatus('targetASA', 'Average Speed of Answer Target (ASA Sec)')}
                <input
                  type="number"
                  placeholder="e.g. 30"
                  value={queueConfig.targetASA ?? ''}
                  onChange={(e) =>
                    setQueueConfig({ ...queueConfig, targetASA: e.target.value === '' ? null : parseInt(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                />
              </div>

              <div>
                {renderFieldStatus('maxAbandonmentRate', 'Maximum Abandonment Rate (fraction, e.g. 0.05)')}
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 0.05"
                  value={queueConfig.maxAbandonmentRate ?? ''}
                  onChange={(e) =>
                    setQueueConfig({
                      ...queueConfig,
                      maxAbandonmentRate: e.target.value === '' ? null : parseFloat(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-white mb-4">Pool & Queue Physics</h3>
            <div className="space-y-4">
              <div>
                {renderFieldStatus('meanPatienceSec', 'Mean Customer Patience (Seconds)')}
                <input
                  type="number"
                  placeholder="e.g. 180"
                  value={queueConfig.meanPatienceSec ?? ''}
                  onChange={(e) =>
                    setQueueConfig({
                      ...queueConfig,
                      meanPatienceSec: e.target.value === '' ? null : parseInt(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                />
              </div>

              <div>
                {renderFieldStatus('patienceCV', 'Patience Coefficient of Variation (CV)')}
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 0.8"
                  value={queueConfig.patienceCV ?? ''}
                  onChange={(e) =>
                    setQueueConfig({
                      ...queueConfig,
                      patienceCV: e.target.value === '' ? null : parseFloat(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                />
              </div>

              <div>
                {renderFieldStatus('productivityFactor', 'Pool Productivity Factor (1.0 = Baseline)')}
                <input
                  type="number"
                  step="0.05"
                  placeholder="e.g. 1.0"
                  value={poolConfig.productivityFactor ?? ''}
                  onChange={(e) =>
                    setPoolConfig({
                      ...poolConfig,
                      productivityFactor: e.target.value === '' ? null : parseFloat(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                />
              </div>

              <div>
                {renderFieldStatus('minSeatsWhileOpen', 'Minimum Seats While Open (Required Section 4.8)')}
                <input
                  type="number"
                  placeholder="e.g. 2"
                  value={poolConfig.minSeatsWhileOpen ?? ''}
                  onChange={(e) =>
                    setPoolConfig({
                      ...poolConfig,
                      minSeatsWhileOpen: e.target.value === '' ? null : parseInt(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                />
              </div>

              <div>
                {renderFieldStatus('hcSearchCeiling', 'HC Search Ceiling (Required Section 4.8)')}
                <input
                  type="number"
                  placeholder="e.g. 60"
                  value={poolConfig.hcSearchCeiling ?? ''}
                  onChange={(e) =>
                    setPoolConfig({
                      ...poolConfig,
                      hcSearchCeiling: e.target.value === '' ? null : parseInt(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCHEDULE BLOCK */}
      {activeTab === 'SCHEDULE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-white mb-2">Allowed Shift Start Times</h3>
            <p className="text-xs text-slate-400 mb-3">
              Engine strictly starts shifts ONLY at these clock times (Section 4.8). At least one required.
            </p>
            {renderFieldStatus('allowedShiftStarts', 'Starts List')}

            <div className="flex gap-2 mb-4 mt-2">
              <input
                type="text"
                placeholder="e.g. 10:00"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
              />
              <button
                onClick={handleAddStartTime}
                className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Start</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {rosterRules.allowedShiftStarts.length === 0 ? (
                <div className="text-xs text-slate-500 italic">No shift starts configured yet.</div>
              ) : (
                rosterRules.allowedShiftStarts.map((time) => (
                  <div
                    key={time}
                    className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded text-xs font-mono text-sky-300"
                  >
                    <span>{time}</span>
                    <button
                      onClick={() => handleRemoveStartTime(time)}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-white mb-4">Hard Labor & Rostering Rules</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {renderFieldStatus('allowedShiftLengths', 'Shift Length (Hours)')}
                  <input
                    type="number"
                    placeholder="e.g. 8"
                    value={rosterRules.allowedShiftLengths[0] ?? ''}
                    onChange={(e) =>
                      setRosterRules({
                        ...rosterRules,
                        allowedShiftLengths: e.target.value === '' ? [] : [parseInt(e.target.value)],
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                  />
                </div>

                <div>
                  {renderFieldStatus('breakDurationMinutes', 'Break Duration (Min)')}
                  <input
                    type="number"
                    placeholder="e.g. 30"
                    value={rosterRules.breakDurationMinutes ?? ''}
                    onChange={(e) =>
                      setRosterRules({
                        ...rosterRules,
                        breakDurationMinutes: e.target.value === '' ? null : parseInt(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  {renderFieldStatus('minRestBetweenShiftsHours', 'Min Rest Between Shifts')}
                  <input
                    type="number"
                    placeholder="e.g. 11"
                    value={rosterRules.minRestBetweenShiftsHours ?? ''}
                    onChange={(e) =>
                      setRosterRules({
                        ...rosterRules,
                        minRestBetweenShiftsHours: e.target.value === '' ? null : parseInt(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                  />
                </div>

                <div>
                  {renderFieldStatus('maxConsecutiveWorkDays', 'Max Consecutive Work Days')}
                  <input
                    type="number"
                    placeholder="e.g. 5"
                    value={rosterRules.maxConsecutiveWorkDays ?? ''}
                    onChange={(e) =>
                      setRosterRules({
                        ...rosterRules,
                        maxConsecutiveWorkDays: e.target.value === '' ? null : parseInt(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  {renderFieldStatus('weeklyOffDays', 'Weekly OFF Days')}
                  <input
                    type="number"
                    placeholder="e.g. 2"
                    value={rosterRules.weeklyOffDays ?? ''}
                    onChange={(e) =>
                      setRosterRules({
                        ...rosterRules,
                        weeklyOffDays: e.target.value === '' ? null : parseInt(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                  />
                </div>

                <div>
                  {renderFieldStatus('breakCount', 'Breaks per Shift')}
                  <input
                    type="number"
                    placeholder="e.g. 2"
                    value={rosterRules.breakCount ?? ''}
                    onChange={(e) =>
                      setRosterRules({
                        ...rosterRules,
                        breakCount: e.target.value === '' ? null : parseInt(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SHRINKAGE BLOCK */}
      {activeTab === 'SHRINKAGE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-bold text-white mb-2">Layer 3 Shrinkage & Grossing (Section 9)</h3>
          <p className="text-xs text-slate-400 mb-4">
            Components already modeled in the roster (e.g. breaks, scheduled offline) are excluded from the residual grossing calculation.
          </p>

          <table className="w-full text-xs text-left mb-6">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-2.5">Component Name</th>
                <th className="p-2.5">Rate (%)</th>
                <th className="p-2.5">Accounting Base</th>
                <th className="p-2.5">Already in Roster</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {shrinkageConfig.components.map((comp, idx) => (
                <tr key={comp.id} className="hover:bg-slate-800/40">
                  <td className="p-2.5 text-white font-semibold">{comp.name}</td>
                  <td className="p-2.5 text-sky-400">
                    <input
                      type="number"
                      step="0.01"
                      value={comp.rate}
                      onChange={(e) => {
                        const updated = [...shrinkageConfig.components];
                        updated[idx].rate = parseFloat(e.target.value) || 0;
                        setShrinkageConfig({ ...shrinkageConfig, components: updated });
                      }}
                      className="bg-slate-950 border border-slate-800 rounded px-2 py-1 w-20 text-white font-mono text-xs"
                    />
                    <span className="ml-1 text-slate-400">({(comp.rate * 100).toFixed(1)}%)</span>
                  </td>
                  <td className="p-2.5 text-slate-400">{comp.base}</td>
                  <td className="p-2.5">
                    <input
                      type="checkbox"
                      checked={comp.alreadyInRoster}
                      onChange={(e) => {
                        const updated = [...shrinkageConfig.components];
                        updated[idx].alreadyInRoster = e.target.checked;
                        setShrinkageConfig({ ...shrinkageConfig, components: updated });
                      }}
                      className="rounded bg-slate-950 border-slate-800 text-sky-600 focus:ring-0"
                    />
                    <span className="text-[11px] text-slate-400 ml-1.5">
                      {comp.alreadyInRoster ? 'Excluded (In Roster)' : 'Included in Grossing'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: CONSTANTS REGISTER */}
      {activeTab === 'CONSTANTS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-bold text-white mb-2">Section 2.1 Constants Register (Class K)</h3>
          <p className="text-xs text-slate-400 mb-4">
            Zero unexplained literals policy. All numerical constants are named with audited provenance.
          </p>

          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-2.5">Constant Name</th>
                <th className="p-2.5">Value</th>
                <th className="p-2.5">Class</th>
                <th className="p-2.5">Mathematical Provenance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {CONSTANTS_REGISTER.map((c) => (
                <tr key={c.name} className="hover:bg-slate-800/40">
                  <td className="p-2.5 text-sky-400 font-bold">{c.name}</td>
                  <td className="p-2.5 text-white">{c.value}</td>
                  <td className="p-2.5 text-amber-400 font-bold">{c.class}</td>
                  <td className="p-2.5 text-slate-400">{c.provenance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
