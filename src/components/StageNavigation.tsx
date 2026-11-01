/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Check, Lock, AlertTriangle, ArrowRight } from 'lucide-react';
import { StageId, StageStatus, RunMode } from '../types/wfm';

interface StageNavigationProps {
  currentStage: StageId;
  onSelectStage: (stage: StageId) => void;
  stageStatuses: Record<StageId, StageStatus>;
  mode: RunMode;
}

export const StageNavigation: React.FC<StageNavigationProps> = ({
  currentStage,
  onSelectStage,
  stageStatuses,
  mode,
}) => {
  const modeAStages: { id: StageId; name: string; number: string; desc: string }[] = [
    { id: 'S1', name: 'Upload FCT', number: 'S1', desc: 'CSV Mapping & 6-Step Cleaning' },
    { id: 'S2', name: 'History', number: 'S2', desc: 'Past Traffic & Backtests' },
    { id: 'S3', name: 'Forecast Release', number: 'S3', desc: 'Lock Confirmed Demand' },
    { id: 'S4', name: 'Config Blocks', number: 'S4', desc: 'Business, Rules & Shrinkage' },
    { id: 'S5', name: 'Estimate', number: 'S5', desc: 'Erlang A/C & Capacity Floors' },
    { id: 'S6', name: 'Pure Requirement', number: 'S6', desc: 'Layer 1 Gain Curves & Bounds' },
    { id: 'S7', name: 'Roster Schedule', number: 'S7', desc: 'Layer 2 Integer LP & Validator' },
    { id: 'S8', name: 'Results & Bridge', number: 'S8', desc: 'Layer 3 Gross HC & Proof' },
  ];

  const modeBStages: { id: StageId; name: string; number: string; desc: string }[] = [
    { id: 'S1', name: 'Upload FCT', number: 'S1', desc: 'CSV Mapping & 6-Step Cleaning' },
    { id: 'S2', name: 'History', number: 'S2', desc: 'Past Traffic & Backtests' },
    { id: 'S3', name: 'Forecast Release', number: 'S3', desc: 'Lock Confirmed Demand' },
    { id: 'S4', name: 'Config Blocks', number: 'S4', desc: 'Given HC & Hard Rules' },
    { id: 'S5', name: 'Estimate', number: 'S5', desc: 'Capacity Benchmark' },
    { id: 'S6B', name: 'Fixed HC Roster', number: 'S6B', desc: 'Build Roster for Given HC' },
    { id: 'S7B', name: 'KPI Achievements', number: 'S7B', desc: 'DES Simulation & Validator' },
  ];

  const stages = mode === 'MODE_A' ? modeAStages : modeBStages;

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-thin">
        {stages.map((stage, idx) => {
          const status = stageStatuses[stage.id] || 'OPEN';
          const isActive = currentStage === stage.id;

          let badgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
          let icon = null;

          if (status === 'DONE') {
            badgeColor = 'bg-emerald-950 text-emerald-400 border-emerald-800';
            icon = <Check className="w-3 h-3" />;
          } else if (status === 'LOCKED') {
            badgeColor = 'bg-slate-900 text-slate-500 border-slate-800';
            icon = <Lock className="w-3 h-3" />;
          } else if (status === 'STALE') {
            badgeColor = 'bg-amber-950 text-amber-400 border-amber-800';
            icon = <AlertTriangle className="w-3 h-3" />;
          }

          return (
            <React.Fragment key={stage.id}>
              <button
                onClick={() => onSelectStage(stage.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition shrink-0 border ${
                  isActive
                    ? 'bg-slate-800 border-sky-500 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${badgeColor}`}
                >
                  {icon || stage.number}
                </div>
                <div>
                  <div
                    className={`text-xs font-semibold ${
                      isActive ? 'text-sky-300' : 'text-slate-300'
                    }`}
                  >
                    {stage.name}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">
                    {stage.desc}
                  </div>
                </div>
              </button>

              {idx < stages.length - 1 && (
                <ArrowRight className="w-3 h-3 text-slate-700 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
