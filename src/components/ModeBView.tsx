/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Target, Users, CheckCircle2, XCircle, ArrowRight, ShieldCheck, Compass } from 'lucide-react';
import { QueueConfig, PoolConfig, RosterRuleConfig, IntervalForecastRecord, SimulatedKpiResult, Fidelity } from '../types/wfm';
import { evaluateCandidateHc } from '../engine/optimizer';

interface ModeBViewProps {
  intervals: IntervalForecastRecord[];
  queueConfig: QueueConfig;
  poolConfig: PoolConfig;
  rosterRules: RosterRuleConfig;
  fidelity: Fidelity;
  minHcSizingResult?: number;
  onOpenValidatorModal: () => void;
  onSwitchToModeA: () => void;
}

export const ModeBView: React.FC<ModeBViewProps> = ({
  intervals,
  queueConfig,
  poolConfig,
  rosterRules,
  fidelity,
  minHcSizingResult,
  onOpenValidatorModal,
  onSwitchToModeA,
}) => {
  const [fixedHc, setFixedHc] = useState<number>(20);
  const [evalResult, setEvalResult] = useState<{ passed: boolean; kpis: SimulatedKpiResult[] }>(() =>
    evaluateCandidateHc(20, intervals, rosterRules, queueConfig, poolConfig, 10, fidelity, 42)
  );

  const handleReevaluate = (newHc: number) => {
    setFixedHc(newHc);
    const res = evaluateCandidateHc(newHc, intervals, rosterRules, queueConfig, poolConfig, 10, fidelity, 42);
    setEvalResult(res);
  };

  const kpi = evalResult.kpis[0];

  return (
    <div className="space-y-6">
      {/* Header & Fixed Headcount Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-sky-400" />
              Mode B: Fixed Headcount Evaluation (Section 10)
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Evaluate the achieved KPIs and SLA compliance for a specific staff size over the full confirmed forecast horizon.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-semibold">Given Headcount:</span>
            <input
              type="number"
              min="1"
              max="200"
              value={fixedHc}
              onChange={(e) => handleReevaluate(parseInt(e.target.value) || 1)}
              className="w-24 bg-slate-950 border border-sky-500 rounded p-2 text-white font-mono text-center font-bold"
            />
            <button
              onClick={() => handleReevaluate(fixedHc)}
              className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 rounded text-xs font-bold transition shadow"
            >
              Simulate HC
            </button>
          </div>
        </div>
      </div>

      {/* KPI Evaluation Results */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-400">Service Level (SL1)</div>
          <div className={`text-2xl font-black mt-1 ${kpi?.slPassed ? 'text-emerald-400' : 'text-red-400'}`}>
            {(kpi?.sl * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Target: &ge; {queueConfig.targetSL !== null ? (queueConfig.targetSL * 100).toFixed(0) : '—'}% in {queueConfig.targetSLTime ?? '—'}s
          </div>
          <div className="mt-2 text-xs font-bold">
            {kpi?.slPassed ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> MET
              </span>
            ) : (
              <span className="text-red-400 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> SHORTFALL
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-400">Average Speed of Answer (ASA)</div>
          <div className={`text-2xl font-black mt-1 ${kpi?.asaPassed ? 'text-emerald-400' : 'text-red-400'}`}>
            {kpi?.asaSec.toFixed(1)}s
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Target: &le; {queueConfig.targetASA}s</div>
          <div className="mt-2 text-xs font-bold">
            {kpi?.asaPassed ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> MET
              </span>
            ) : (
              <span className="text-red-400 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> BREACH
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-400">Customer Abandonment Rate</div>
          <div className={`text-2xl font-black mt-1 ${kpi?.abandonmentPassed ? 'text-emerald-400' : 'text-red-400'}`}>
            {(kpi?.abandonmentRate * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Target Cap: &le; {queueConfig.maxAbandonmentRate !== null ? (queueConfig.maxAbandonmentRate * 100).toFixed(0) : '—'}%
          </div>
          <div className="mt-2 text-xs font-bold">
            {kpi?.abandonmentPassed ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> MET
              </span>
            ) : (
              <span className="text-red-400 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> EXCEEDED
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-400">Agent Workload Occupancy</div>
          <div className="text-2xl font-black text-sky-400 mt-1">
            {(kpi?.occupancy * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Target Cap: &le; {((poolConfig.occupancyCap || 0.88) * 100).toFixed(0)}%
          </div>
          <div className="mt-2 text-xs font-bold text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> WITHIN CAP
          </div>
        </div>
      </div>

      {/* Comparison against Min HC & Gap Analysis */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-purple-400" />
              Gap to Minimum Feasible Headcount (Section 10.4)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {minHcSizingResult ? (
                <>
                  Mode A certified minimum HC is <strong className="text-sky-300">{minHcSizingResult} agents</strong>.
                  Current fixed HC is {fixedHc} ({fixedHc >= minHcSizingResult ? (
                    <span className="text-emerald-400">+{fixedHc - minHcSizingResult} surplus heads</span>
                  ) : (
                    <span className="text-red-400">-{minHcSizingResult - fixedHc} deficit heads</span>
                  )}).
                </>
              ) : (
                'Run Mode A to calculate the exact mathematical minimum HC required to achieve all targets.'
              )}
            </p>
          </div>

          <button
            onClick={onSwitchToModeA}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition"
          >
            <span>Switch to Mode A (Find Min HC)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
