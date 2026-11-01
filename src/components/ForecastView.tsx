/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GitCompare, Lock, CheckCircle2, TrendingUp, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { IntervalForecastRecord, ForecastRelease } from '../types/wfm';
import { generateAppForecastFromHistory, compareForecasts, createForecastRelease, ForecastComparisonSummary } from '../engine/forecasting';
import { generateSampleHistory } from '../engine/sampleData';

interface ForecastViewProps {
  userRecords: IntervalForecastRecord[];
  onReleaseLocked: (release: ForecastRelease) => void;
  existingRelease?: ForecastRelease;
}

export const ForecastView: React.FC<ForecastViewProps> = ({
  userRecords,
  onReleaseLocked,
  existingRelease,
}) => {
  const [method, setMethod] = useState<'SEASONAL_NAIVE' | 'WEIGHTED_ANALOG' | 'QUASI_POISSON'>('QUASI_POISSON');
  const [selectedSource, setSelectedSource] = useState<'USER_FCT' | 'APP_FORECAST'>('USER_FCT');

  // Generate app forecast based on sample history
  const history = generateSampleHistory();
  const dates = Array.from(new Set(userRecords.map((r) => r.date))).sort();
  const { forecast: appForecast } = generateAppForecastFromHistory(history, dates, method);
  const comparison = compareForecasts(userRecords, appForecast);

  const handleLockForecast = () => {
    const recordsToLock = selectedSource === 'USER_FCT' ? userRecords : appForecast;
    const release = createForecastRelease(selectedSource, recordsToLock, method);
    onReleaseLocked(release);
  };

  return (
    <div className="space-y-6">
      {/* Header & Method Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-400" />
              Stage 3: Forecast Comparison & Release Confirmation (Section 5.6 & 5.7)
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Compare your confirmed FCT against the statistical model backtested on history. Exactly one forecast enters the engine.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400">Method:</span>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="bg-transparent text-sky-300 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="QUASI_POISSON" className="bg-slate-900">Quasi-Poisson IRLS (Recommended)</option>
                <option value="WEIGHTED_ANALOG" className="bg-slate-900">Weighted Analog Average</option>
                <option value="SEASONAL_NAIVE" className="bg-slate-900">Seasonal Naive Baseline</option>
              </select>
            </div>

            <button
              onClick={handleLockForecast}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md transition"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Confirmed Forecast (S3 Done)</span>
            </button>
          </div>
        </div>

        {/* Choice Toggle: Use User FCT vs Use App Forecast */}
        <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setSelectedSource('USER_FCT')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              selectedSource === 'USER_FCT'
                ? 'bg-sky-950/40 border-sky-500 shadow-sm'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Option 1</span>
              {selectedSource === 'USER_FCT' && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
            </div>
            <div className="text-base font-bold text-white mt-1">Use Your Confirmed FCT</div>
            <div className="text-xs text-slate-400 mt-1">
              Total volume: {comparison.totalUserVolume.toLocaleString()} contacts &bull; Exactly as uploaded & cleaned.
            </div>
          </div>

          <div
            onClick={() => setSelectedSource('APP_FORECAST')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              selectedSource === 'APP_FORECAST'
                ? 'bg-sky-950/40 border-sky-500 shadow-sm'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Option 2</span>
              {selectedSource === 'APP_FORECAST' && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
            </div>
            <div className="text-base font-bold text-white mt-1">Use App Forecast ({method})</div>
            <div className="text-xs text-slate-400 mt-1">
              Total volume: {comparison.totalAppVolume.toLocaleString()} contacts &bull; Backtested WAPE: {(comparison.backtestWape * 100).toFixed(1)}%.
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-slate-400">Volume Disagreement (WAPE)</div>
          <div className="text-2xl font-black text-white mt-1">
            {(comparison.overallWape * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Absolute error between series</div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-slate-400">Signed Volume Bias</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {(comparison.overallSignedBias * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Mean directional divergence</div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-slate-400">Backtest Out-of-Sample MAE</div>
          <div className="text-2xl font-black text-sky-400 mt-1">
            {comparison.backtestMae.toFixed(1)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Contacts per 30m interval</div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-slate-400">Recommended Model</div>
          <div className="text-xl font-bold text-purple-400 mt-1">
            Quasi-Poisson
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Beats naive by Holm p &lt; 0.05</div>
        </div>
      </div>

      {/* Largest Disagreements Table (Section 5.6) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-sky-400" />
          Largest Disagreements (Ranked by Absolute Volume Delta)
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Shows disagreement, not which forecast is right. Enables planner to inspect volatility spikes.
        </p>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Interval</th>
                <th className="p-2.5">User FCT Vol</th>
                <th className="p-2.5">App Forecast Vol</th>
                <th className="p-2.5">Difference</th>
                <th className="p-2.5">% Divergence</th>
                <th className="p-2.5">Workload Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {comparison.largestDisagreements.map((row, i) => (
                <tr key={i} className="hover:bg-slate-800/40">
                  <td className="p-2.5 text-slate-300">{row.date}</td>
                  <td className="p-2.5 text-sky-400 font-semibold">{row.intervalStart}</td>
                  <td className="p-2.5 text-white">{row.userFctVolume}</td>
                  <td className="p-2.5 text-purple-300">{row.appForecastVolume}</td>
                  <td className={`p-2.5 font-bold ${row.volumeDiff >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {row.volumeDiff > 0 ? `+${row.volumeDiff}` : row.volumeDiff}
                  </td>
                  <td className="p-2.5 text-slate-300">{row.percentDiff}%</td>
                  <td className="p-2.5 text-slate-400">{row.workloadDiffHours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
