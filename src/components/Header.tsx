/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, Play, ShieldAlert, CheckCircle2, FileCode, Layers, RefreshCw } from 'lucide-react';
import { RunMode, Fidelity } from '../types/wfm';
import { generateProjectZipBlob, downloadBlob } from '../engine/zipExport';
import { generateStandaloneOfflineHtml } from '../engine/standaloneHtmlBundle';

interface HeaderProps {
  mode: RunMode;
  setMode: (mode: RunMode) => void;
  fidelity: Fidelity;
  setFidelity: (fidelity: Fidelity) => void;
  onOpenTests: () => void;
  onOpenChallenger: () => void;
  onRecalculate: () => void;
  isCalculating: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  setMode,
  fidelity,
  setFidelity,
  onOpenTests,
  onOpenChallenger,
  onRecalculate,
  isCalculating,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadZip = async () => {
    try {
      setIsExporting(true);
      const zipBlob = await generateProjectZipBlob();
      downloadBlob(zipBlob, 'wfm_prd_v7_1_project_bundle.zip');
    } catch (err) {
      console.error('Failed to generate project zip', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadHtml = () => {
    const html = generateStandaloneOfflineHtml();
    const blob = new Blob([html], { type: 'text/html' });
    downloadBlob(blob, 'wfm_engine_v7_1_standalone.html');
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-6 py-4 shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* App Title & Badges */}
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-sky-500/10 p-2 rounded-lg border border-sky-500/30">
              <Layers className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                WFM Minimum-HC Sizing & Scheduling Engine
                <span className="text-xs bg-sky-950 text-sky-300 font-mono px-2 py-0.5 rounded border border-sky-800">
                  PRD v7.1
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Contact Center Minimum-HC Sizing & Scheduling Engine with Discrete Event Simulation & Governance
              </p>
            </div>
          </div>
        </div>

        {/* Mode & Fidelity Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher */}
          <div className="bg-slate-800 p-1 rounded-lg border border-slate-700 flex text-xs">
            <button
              onClick={() => setMode('MODE_A')}
              className={`px-3 py-1.5 rounded-md font-semibold transition ${
                mode === 'MODE_A'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mode A: Find Min HC
            </button>
            <button
              onClick={() => setMode('MODE_B')}
              className={`px-3 py-1.5 rounded-md font-semibold transition ${
                mode === 'MODE_B'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mode B: Fixed HC
            </button>
          </div>

          {/* Fidelity Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
            <span className="text-slate-400 font-medium">Fidelity:</span>
            <select
              value={fidelity}
              onChange={(e) => setFidelity(e.target.value as Fidelity)}
              className="bg-transparent text-sky-300 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="QUICK" className="bg-slate-800 text-white">Quick (Estimated)</option>
              <option value="SCREENED" className="bg-slate-800 text-white">Screened (Sequential)</option>
              <option value="CERTIFIED" className="bg-slate-800 text-white">Certified (95% CI DES)</option>
            </select>
          </div>

          {/* Recalculate button */}
          <button
            onClick={onRecalculate}
            disabled={isCalculating}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
            {isCalculating ? 'Computing...' : 'Recalculate'}
          </button>

          {/* Test Runner Button */}
          <button
            onClick={onOpenTests}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition"
            title="Run Acceptance Test Suite (Cases 1-9 & Holdout Pack)"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Test Suite</span>
          </button>

          {/* Challenger Console Button */}
          <button
            onClick={onOpenChallenger}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition"
            title="Part B Challenger Team & Release Gate Console"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Challenger</span>
          </button>

          {/* Download Standalone HTML */}
          <button
            onClick={handleDownloadHtml}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition"
            title="Download Single-File Zero-Dependency Offline HTML"
          >
            <FileCode className="w-3.5 h-3.5 text-sky-400" />
            <span>Single HTML</span>
          </button>

          {/* Download Full Project ZIP */}
          <button
            onClick={handleDownloadZip}
            disabled={isExporting}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition"
            title="Download full project zip containing all source files and the standalone offline HTML"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Packaging...' : 'Project ZIP'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
