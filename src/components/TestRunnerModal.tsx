/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Play, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import { runFullTestSuite, TestCaseResult } from '../engine/testSuite';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestCaseResult[]>(() => runFullTestSuite());

  if (!isOpen) return null;

  const handleRunTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runFullTestSuite();
      setTestResults(res);
      setIsRunning(false);
    }, 150);
  };

  const totalPassed = testResults.filter((t) => t.passed).length;
  const totalFailed = testResults.filter((t) => !t.passed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                PRD Section 14.3 Acceptance Test Suite & Oracle Verification
              </h3>
              <p className="text-xs text-slate-400">
                Executes Cases 1-9, Holdout Pack, and Section 14.2 Mathematical Invariants.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Metric Bar */}
        <div className="px-6 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-slate-400">
              Total Tests: <strong className="text-white">{testResults.length}</strong>
            </span>
            <span className="text-emerald-400">
              Passed: <strong>{totalPassed}</strong>
            </span>
            <span className={totalFailed > 0 ? 'text-red-400 font-bold' : 'text-slate-500'}>
              Failed: <strong>{totalFailed}</strong>
            </span>
          </div>

          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Running Tests...' : 'Re-Run All Tests'}</span>
          </button>
        </div>

        {/* Test List */}
        <div className="p-6 overflow-y-auto space-y-3">
          {testResults.map((test) => (
            <div
              key={test.id}
              className={`p-4 rounded-xl border text-xs transition ${
                test.passed
                  ? 'bg-slate-950/80 border-slate-800/80'
                  : 'bg-red-950/20 border-red-800/60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sky-400 font-bold">{test.id}</span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="font-semibold text-white">{test.name}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                      {test.category}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">{test.details}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {test.durationMs}ms
                  </span>
                  {test.passed ? (
                    <span className="text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-800 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                    </span>
                  ) : (
                    <span className="text-red-400 font-bold bg-red-950/40 border border-red-800 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> FAIL
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-900 grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-500">Expected: </span>
                  <span className="text-slate-300">{test.expected}</span>
                </div>
                <div>
                  <span className="text-slate-500">Observed: </span>
                  <span className="text-sky-300 font-semibold">{test.observed}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-lg text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
