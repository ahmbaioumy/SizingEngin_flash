/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, AlertOctagon, Terminal, Users, ShieldCheck, Lock } from 'lucide-react';
import { CHALLENGER_TEAM, PRESET_ATTACK_LOGS, RELEASE_GATE_CRITERIA } from '../engine/governance';

interface ChallengerConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChallengerConsole: React.FC<ChallengerConsoleProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'ATTACKS' | 'CHALLENGERS' | 'GATE'>('ATTACKS');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                Part B Challenger Console & Release Gate (Section 19.9 & 22)
              </h3>
              <p className="text-xs text-slate-400">
                Independent adversarial challenge team (7 members), attack taxonomy A01-A12, and default-deny release gate.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="px-6 py-2.5 bg-slate-950 border-b border-slate-800 flex gap-2">
          {[
            { id: 'ATTACKS', label: 'Attack Logs (A01 - A12)', icon: Terminal },
            { id: 'CHALLENGERS', label: '7-Member Challenger Team', icon: Users },
            { id: 'GATE', label: 'Release Gate (G1 - G15)', icon: Lock },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-slate-800 text-amber-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {tab === 'ATTACKS' && (
            <div className="space-y-3">
              {PRESET_ATTACK_LOGS.map((log) => (
                <div key={log.attackCode} className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-amber-400 font-bold text-sm">{log.attackCode}</span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="font-bold text-white text-sm">{log.attackName}</span>
                      <span className="text-[10px] bg-slate-800 text-sky-300 px-1.5 py-0.5 rounded font-mono">
                        {log.targetDomain}
                      </span>
                    </div>
                    <span className="text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-800 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {log.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-400">
                    <div>
                      <span className="text-slate-500 font-semibold">Adversarial Input: </span>
                      <span>{log.inputDescription}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold">Defense / Observed Result: </span>
                      <span className="text-slate-300">{log.observedResult}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'CHALLENGERS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CHALLENGER_TEAM.map((role) => (
                <div key={role.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-sky-400 text-sm">{role.id}: </span>
                      <span className="font-bold text-white text-sm">{role.name}</span>
                    </div>
                    <span className="text-[10px] bg-slate-800 text-purple-300 px-2 py-0.5 rounded font-mono">
                      {role.domain}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{role.mission}</p>
                  <div className="pt-2 border-t border-slate-900 flex flex-wrap gap-1">
                    <span className="text-[10px] text-slate-500">Assigned Codes:</span>
                    {role.assignedAttackCodes.map((code) => (
                      <span key={code} className="bg-slate-900 text-amber-300 font-mono text-[10px] px-1.5 py-0.2 rounded border border-slate-800">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'GATE' && (
            <div className="space-y-2">
              {RELEASE_GATE_CRITERIA.map((crit) => (
                <div key={crit.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono text-sky-400 font-bold">{crit.id}: </span>
                    <span className="font-bold text-white">{crit.title}</span>
                    <div className="text-slate-400 text-[11px] mt-0.5">{crit.description}</div>
                    <div className="text-slate-500 font-mono text-[10px] mt-0.5">Evidence: {crit.evidence}</div>
                  </div>
                  <span className="text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-800 px-2.5 py-1 rounded text-xs flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" /> MET
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-lg text-xs font-semibold"
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
};
