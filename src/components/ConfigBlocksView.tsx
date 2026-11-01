/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Settings, Clock, Calendar, PieChart, Shield, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { QueueConfig, PoolConfig, RosterRuleConfig, ShrinkageConfig, RunControls } from '../types/wfm';
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
              Configure Business targets, hard Roster rules, and unmodeled Shrinkage rates. All parameters are P-Class with zero hidden defaults.
            </p>
          </div>

          <button
            onClick={onConfirmAndRunSizing}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md transition"
          >
            <span>Proceed to Sizing & Scheduling</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

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
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Service Level Target (SL1 %)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="1.0"
                    value={queueConfig.targetSL}
                    onChange={(e) => setQueueConfig({ ...queueConfig, targetSL: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                  />
                  <span className="text-xs text-slate-400 w-16">{(queueConfig.targetSL * 100).toFixed(0)}%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Target Threshold Time (Seconds)
                </label>
                <input
                  type="number"
                  value={queueConfig.targetSLTime}
                  onChange={(e) => setQueueConfig({ ...queueConfig, targetSLTime: parseInt(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Average Speed of Answer (ASA Target Sec)
                </label>
                <input
                  type="number"
                  value={queueConfig.targetASA}
                  onChange={(e) => setQueueConfig({ ...queueConfig, targetASA: parseInt(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Maximum Abandonment Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={queueConfig.maxAbandonmentRate}
                  onChange={(e) => setQueueConfig({ ...queueConfig, maxAbandonmentRate: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-white mb-4">Pool & Queue Physics</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Mean Customer Patience (Seconds)
                </label>
                <input
                  type="number"
                  value={queueConfig.meanPatienceSec}
                  onChange={(e) => setQueueConfig({ ...queueConfig, meanPatienceSec: parseInt(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Pool Productivity Factor (1.0 = Baseline)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={poolConfig.productivityFactor}
                  onChange={(e) => setPoolConfig({ ...poolConfig, productivityFactor: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Minimum Seats While Open (Required Section 4.8)
                </label>
                <input
                  type="number"
                  value={poolConfig.minSeatsWhileOpen}
                  onChange={(e) => setPoolConfig({ ...poolConfig, minSeatsWhileOpen: parseInt(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  HC Search Ceiling (Required Section 4.8)
                </label>
                <input
                  type="number"
                  value={poolConfig.hcSearchCeiling}
                  onChange={(e) => setPoolConfig({ ...poolConfig, hcSearchCeiling: parseInt(e.target.value) })}
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
            <h3 className="text-sm font-bold text-white mb-4">Allowed Shift Start Times</h3>
            <p className="text-xs text-slate-400 mb-3">
              Engine will strictly start shifts ONLY at these clock times (Section 4.8).
            </p>

            <div className="flex gap-2 mb-4">
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
              {rosterRules.allowedShiftStarts.map((time) => (
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
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-white mb-4">Hard Labor & Rostering Rules</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Shift Length (Hours)
                  </label>
                  <input
                    type="number"
                    value={rosterRules.allowedShiftLengths[0]}
                    onChange={(e) =>
                      setRosterRules({ ...rosterRules, allowedShiftLengths: [parseInt(e.target.value)] })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Breaks Count & Duration
                  </label>
                  <input
                    type="number"
                    value={rosterRules.breakDurationMinutes}
                    onChange={(e) =>
                      setRosterRules({ ...rosterRules, breakDurationMinutes: parseInt(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Min Rest Between Shifts (Hours)
                  </label>
                  <input
                    type="number"
                    value={rosterRules.minRestBetweenShiftsHours}
                    onChange={(e) =>
                      setRosterRules({ ...rosterRules, minRestBetweenShiftsHours: parseInt(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Max Consecutive Work Days
                  </label>
                  <input
                    type="number"
                    value={rosterRules.maxConsecutiveWorkDays}
                    onChange={(e) =>
                      setRosterRules({ ...rosterRules, maxConsecutiveWorkDays: parseInt(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Weekly OFF Days
                </label>
                <input
                  type="number"
                  value={rosterRules.weeklyOffDays}
                  onChange={(e) =>
                    setRosterRules({ ...rosterRules, weeklyOffDays: parseInt(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-sm"
                />
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
                        updated[idx].rate = parseFloat(e.target.value);
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
