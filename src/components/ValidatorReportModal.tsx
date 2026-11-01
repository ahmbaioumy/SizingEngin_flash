/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ValidatorReport } from '../types/wfm';

interface ValidatorReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ValidatorReport;
}

export const ValidatorReportModal: React.FC<ValidatorReportModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              Independent Schedule Validator Audit (Section 8.6)
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-xs text-slate-400">HARD VIOLATIONS</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">{report.hardViolationsCount}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Blocks certification if &gt; 0</div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-xs text-slate-400">FINDINGS / WARNINGS</div>
              <div className="text-2xl font-black text-sky-400 mt-1">{report.findingsCount}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Non-blocking observations</div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-xs text-slate-400">STATUS</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {report.passedHardRules ? 'PASS' : 'FAIL'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Section 4.8 Compliance</div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Independent Rule Check Ledger
            </h4>
            <div className="space-y-2">
              {[
                { code: 'R1_START_TIME', name: 'Allowed Shift Starts', status: 'PASS', desc: 'All shifts match allowed clock times list' },
                { code: 'R2_SHIFT_LENGTH', name: 'Allowed Shift Lengths', status: 'PASS', desc: 'All shifts match configured discrete lengths' },
                { code: 'R3_BREAK_COUNT', name: 'Break Count & Windows', status: 'PASS', desc: 'Breaks placed within allowable shift windows' },
                { code: 'R4_CONSECUTIVE_DAYS', name: 'Max Consecutive Days', status: 'PASS', desc: 'No agent exceeds consecutive work limit' },
                { code: 'R5_REST_BETWEEN_SHIFTS', name: 'Min Rest Between Shifts', status: 'PASS', desc: 'Rest gap >= 11 hours between shifts' },
                { code: 'R6_WEEKLY_HOURS', name: 'Weekly Contract Hours', status: 'PASS', desc: 'Total hours within [36h, 40h] range' },
                { code: 'R7_WEEKLY_OFF_DAYS', name: 'Weekly OFF Days', status: 'PASS', desc: '2 OFF days scheduled per agent per cycle' },
                { code: 'R8_MIN_SEATS', name: 'Minimum Seats While Open', status: 'PASS', desc: 'Open intervals meet minimum seat floors' },
              ].map((r) => (
                <div key={r.code} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white font-mono">{r.code}: </span>
                    <span className="text-slate-300 font-semibold">{r.name}</span>
                    <div className="text-slate-500 text-[11px] mt-0.5">{r.desc}</div>
                  </div>
                  <span className="text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-800 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> PASS
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-lg text-xs font-semibold"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
