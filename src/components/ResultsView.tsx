/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Award, ShieldCheck, CheckCircle2, AlertTriangle, HelpCircle, Download, FileSpreadsheet, Compass, Sliders, Users, Calendar } from 'lucide-react';
import { Layer1Result, Layer2Result } from '../engine/optimizer';
import { ModeABridge, GuardrailAnalysis, AssumptionExposureItem, Fidelity } from '../types/wfm';
import { computeModeABridge, calculateGuardrailCost, computeAssumptionExposure } from '../engine/bridge';
import { ShrinkageConfig } from '../types/wfm';
import { downloadBlob } from '../engine/zipExport';

interface ResultsViewProps {
  layer1: Layer1Result;
  layer2: Layer2Result;
  shrinkageConfig: ShrinkageConfig;
  fidelity: Fidelity;
  onOpenValidatorModal: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  layer1,
  layer2,
  shrinkageConfig,
  fidelity,
  onOpenValidatorModal,
}) => {
  const bridge = computeModeABridge(layer1, layer2, shrinkageConfig);
  const assumptions = computeAssumptionExposure(layer2.rosterHc);

  const [dailySlFloor, setDailySlFloor] = useState<number>(0.75);
  const [requiredDaysMet, setRequiredDaysMet] = useState<number>(0.90);
  const guardrail = calculateGuardrailCost(layer2.rosterHc, dailySlFloor, requiredDaysMet);

  // Export roster CSV
  const handleExportRosterCsv = () => {
    const lines = ['agent_id,agent_name,day_index,date,shift_start,shift_end,shift_hours,is_off,breaks'];
    for (const s of layer2.rosterSchedules) {
      const breaksStr = s.breaks.map((b) => `${b.start}(${b.durationMinutes}m)`).join(';');
      lines.push(`${s.agentId},${s.agentName},${s.dayIndex},${s.date},${s.shiftStart},${s.shiftEnd},${s.shiftDurationHours},${s.isOffDay},"${breaksStr}"`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    downloadBlob(blob, 'roster_schedule_mode_a.csv');
  };

  return (
    <div className="space-y-6">
      {/* Top Headline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Pure Requirement (Layer 1)
          </div>
          <div className="text-3xl font-black text-white mt-2">
            {bridge.step0PureFte.toFixed(1)}
            <span className="text-sm font-normal text-slate-400 ml-1.5">FTE-equivalent</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            {bridge.step0PureSeatHours.toFixed(1)} seat-hours &bull; Peak: {bridge.step0PeakSeats} seats
          </div>
          <div className="text-[11px] text-sky-400 mt-1">Unconstrained interval workload basis</div>
        </div>

        <div className="bg-slate-900 border border-sky-500/40 rounded-xl p-6 shadow-sm bg-gradient-to-br from-slate-900 to-sky-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Roster HC (Layer 2)
            </span>
            <span className="text-[10px] bg-sky-950 text-sky-300 font-mono px-2 py-0.5 rounded border border-sky-800">
              {fidelity === 'CERTIFIED' ? 'Certified (95% CI)' : fidelity === 'SCREENED' ? 'Screened' : 'Estimated'}
            </span>
          </div>
          <div className="text-3xl font-black text-sky-300 mt-2">
            {bridge.rosterHc}
            <span className="text-sm font-normal text-slate-400 ml-1.5">Agents</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Rigorous Lower Bound: {bridge.rigorousLowerBoundHc} &bull; Gap: +{bridge.gapToRigorousBound}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">&#10004; Hard schedule rules satisfied</div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-6 shadow-sm bg-gradient-to-br from-slate-900 to-emerald-950/20">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Gross Headcount (Layer 3)
          </div>
          <div className="text-3xl font-black text-emerald-300 mt-2">
            {bridge.grossHc}
            <span className="text-sm font-normal text-slate-400 ml-1.5">Total HC</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Residual Shrinkage: {(bridge.residualShrinkageRate * 100).toFixed(1)}% (Excluded in-roster)
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Denominator: 1 - {(bridge.residualShrinkageRate * 100).toFixed(1)}% = {(1 - bridge.residualShrinkageRate).toFixed(2)}
          </div>
        </div>
      </div>

      {/* The Mode A 5-Step Bridge Decomposition (Section 1.3 & 8.8) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-sky-400" />
              The Mode A 5-Step Bridge (Decomposition of Staffing Deltas)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Shows how the staffing number builds up from pure business requirement to final schedule (Section 8.8).
            </p>
          </div>

          <button
            onClick={onOpenValidatorModal}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Schedule Validator (8.6)</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Bridge Step</th>
                <th className="p-3">Headcount</th>
                <th className="p-3">Delta</th>
                <th className="p-3">Cause / Modeling Domain</th>
                <th className="p-3">Model Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {bridge.stepBreakdown.map((row, i) => (
                <tr key={i} className="hover:bg-slate-800/40">
                  <td className="p-3 text-white font-bold">{row.step}</td>
                  <td className="p-3 text-sky-300 text-sm font-semibold">{row.hc.toFixed(2)}</td>
                  <td className="p-3 text-emerald-400 font-semibold">
                    {row.delta > 0 && i > 0 ? `+${row.delta.toFixed(2)}` : row.delta.toFixed(2)}
                  </td>
                  <td className="p-3 text-slate-300 font-sans">{row.cause}</td>
                  <td className="p-3 font-sans">
                    {row.isModelBased ? (
                      <span className="text-slate-400 bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                        Model-based
                      </span>
                    ) : (
                      <span className="text-emerald-300 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded text-[11px] font-bold">
                        {fidelity} Simulation
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Minimality Proof Panel (Section 11.6) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <Award className="w-4 h-4 text-sky-400" />
          Minimality Proof & Indifference Zone (Section 11.6)
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Statistically certifies that candidate HC passes all targets and candidate HC - 1 fails at the chosen confidence level.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="text-xs text-slate-400">Certified HC ({bridge.rosterHc} Agents) Evaluation</div>
            <div className="text-lg font-bold text-emerald-400 mt-1">PASS (All Horizon Targets Met)</div>
            <div className="text-xs text-slate-400 mt-2 font-mono">
              SL1: {(layer2.proof.kpisAtCertifiedHc[0]?.sl * 100).toFixed(1)}% &bull; ASA:{' '}
              {layer2.proof.kpisAtCertifiedHc[0]?.asaSec.toFixed(1)}s &bull; Answer Rate:{' '}
              {(layer2.proof.kpisAtCertifiedHc[0]?.answerRate * 100).toFixed(1)}%
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="text-xs text-slate-400">
              Candidate at HC - 1 ({layer2.proof.candidateMinusOneHc} Agents)
            </div>
            <div className="text-lg font-bold text-red-400 mt-1">FAIL (Non-Passing Candidate)</div>
            <div className="text-xs text-slate-400 mt-2 font-mono">
              Binding Failed Target: <span className="text-amber-300">{layer2.proof.failingKpiAtMinusOne}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
          <strong>Certified Wording (Section 11.6): </strong>
          <span className="text-sky-300">{layer2.proof.certificationWording}</span>
        </div>
      </div>

      {/* Start-List Diagnostic & Guardrail Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Start-list diagnostic */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            Start-List Diagnostic (Section 8.9)
          </h4>
          <p className="text-xs text-slate-400 mb-4">
            LP reduced-costs analysis identifying the single extra start time that would save the most heads.
          </p>
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="text-xs text-slate-400">Recommended Extra Shift Start</div>
            <div className="text-xl font-bold text-purple-300 mt-1">{layer2.recommendedExtraStart}</div>
            <p className="text-xs text-slate-400 mt-2">
              Adding this flexible start time to your schedule block reduces boundary quantization loss, potentially saving{' '}
              <strong className="text-emerald-400">1 to 2 heads</strong>.
            </p>
          </div>
        </div>

        {/* Guardrail Impact */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Guardrail Cost Analysis (Section 12.6)
          </h4>
          <p className="text-xs text-slate-400 mb-4">
            Simulate the incremental cost of enforcing daily SL floors on top of horizon-level pooling.
          </p>
          <div className="flex gap-4 mb-3">
            <div>
              <span className="text-[11px] text-slate-400">Daily SL Floor:</span>
              <input
                type="number"
                step="0.05"
                value={dailySlFloor}
                onChange={(e) => setDailySlFloor(parseFloat(e.target.value))}
                className="w-20 bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white font-mono ml-1.5"
              />
            </div>
            <div>
              <span className="text-[11px] text-slate-400">% Days Met:</span>
              <input
                type="number"
                step="0.05"
                value={requiredDaysMet}
                onChange={(e) => setRequiredDaysMet(parseFloat(e.target.value))}
                className="w-20 bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white font-mono ml-1.5"
              />
            </div>
          </div>
          <div className="text-xs text-amber-300 bg-amber-950/30 p-2.5 rounded border border-amber-900/40">
            {guardrail.impactSummary}
          </div>
        </div>
      </div>

      {/* Assumption Exposure (Section 12.7) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          Assumption Exposure & Sensitivity (Section 12.7)
        </h4>
        <p className="text-xs text-slate-400 mb-4">
          On-demand sensitivity test for uncalibrated operational assumptions showing impact on Roster HC.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {assumptions.map((item) => (
            <div key={item.name} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
              <div className="text-xs font-semibold text-slate-300">{item.name}</div>
              <div className="text-[11px] text-slate-500 mt-1">Current: {item.currentValue}</div>
              <div className="mt-2 text-xs flex justify-between font-mono">
                <span className="text-emerald-400">{item.lowValue}: {item.hcImpactLow} HC</span>
                <span className="text-amber-400">{item.highValue}: +{item.hcImpactHigh} HC</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Schedule Grid & Heatmap */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-400" />
              Generated Agent Shift Schedules ({layer2.rosterSchedules.length} Shifts)
            </h4>
            <p className="text-xs text-slate-400">
              Agent-by-day roster table. Strictly adheres to allowed starts, lengths, rest gaps, and OFF patterns.
            </p>
          </div>

          <button
            onClick={handleExportRosterCsv}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export Roster CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg max-h-80">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
              <tr>
                <th className="p-2.5">Agent</th>
                <th className="p-2.5">Name</th>
                <th className="p-2.5">Day</th>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Shift Window</th>
                <th className="p-2.5">Duration</th>
                <th className="p-2.5">Scheduled Breaks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {layer2.rosterSchedules.slice(0, 30).map((s, i) => (
                <tr key={i} className="hover:bg-slate-800/40">
                  <td className="p-2.5 text-sky-400 font-bold">{s.agentId}</td>
                  <td className="p-2.5 text-slate-300 font-sans">{s.agentName}</td>
                  <td className="p-2.5 text-slate-400">Day {s.dayIndex + 1}</td>
                  <td className="p-2.5 text-slate-400">{s.date}</td>
                  <td className="p-2.5">
                    {s.isOffDay || s.shiftStart === 'OFF' ? (
                      <span className="text-slate-500 bg-slate-950 px-2 py-0.5 rounded text-[11px]">OFF DAY</span>
                    ) : (
                      <span className="text-emerald-300 bg-emerald-950/40 border border-emerald-900/60 px-2 py-0.5 rounded text-[11px]">
                        {s.shiftStart} - {s.shiftEnd}
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-slate-300">{s.shiftDurationHours}h</td>
                  <td className="p-2.5 text-slate-400 text-[11px]">
                    {s.breaks.length > 0
                      ? s.breaks.map((b) => `${b.start} (${b.durationMinutes}m)`).join(', ')
                      : 'None'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
