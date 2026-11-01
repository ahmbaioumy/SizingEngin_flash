/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertOctagon, Sparkles, Download, ArrowRight, ShieldCheck } from 'lucide-react';
import { IntervalForecastRecord, CleanedDatasetReport } from '../types/wfm';
import { parseCsv, proposeColumnMapping, cleanForecastDataset, ColumnMapping } from '../engine/cleaner';
import { generateRealisticVoiceFct, getRealisticVoiceFctCsv } from '../engine/sampleData';
import { downloadBlob } from '../engine/zipExport';

interface DataIngestionViewProps {
  onDatasetConfirmed: (records: IntervalForecastRecord[], report: CleanedDatasetReport) => void;
  existingReport?: CleanedDatasetReport;
  existingRecords?: IntervalForecastRecord[];
}

export const DataIngestionView: React.FC<DataIngestionViewProps> = ({
  onDatasetConfirmed,
  existingReport,
  existingRecords,
}) => {
  const [csvContent, setCsvContent] = useState<string>('');
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    dateCol: '',
    intervalCol: '',
    queueCol: '',
    volumeCol: '',
    ahtCol: '',
  });
  const [cleaningReport, setCleaningReport] = useState<CleanedDatasetReport | null>(existingReport || null);
  const [cleanedRecords, setCleanedRecords] = useState<IntervalForecastRecord[]>(existingRecords || []);
  const [duplicateRule, setDuplicateRule] = useState<'FIRST' | 'LAST' | 'EXCLUDE_ALL'>('FIRST');

  // Handle file drop / upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCsvText(text);
    };
    reader.readAsText(file);
  };

  const processCsvText = (text: string) => {
    setCsvContent(text);
    const parsed = parseCsv(text);
    if (parsed.length > 1) {
      setRawRows(parsed);
      const head = parsed[0];
      setHeaders(head);
      const proposed = proposeColumnMapping(head);
      setMapping(proposed);
      runCleaning(parsed, proposed, duplicateRule);
    }
  };

  const loadSampleDataset = () => {
    const csv = getRealisticVoiceFctCsv();
    processCsvText(csv);
  };

  const loadHostileTestDataset = () => {
    const hostileCsv = `CallDate,TimePeriod,ServiceGroup,InboundVol,HandleSeconds
2026-11-01,08:00,VoiceQ1,50,300
2026-11-01,08:30,VoiceQ1,-15,300
2026-11-01,09:00,VoiceQ1,65,0
2026-11-01,09:30,VoiceQ1,55,290
2026-11-01,09:30,VoiceQ1,55,290
2026-11-01,10:00,VoiceQ1,72,280
2026-11-01,10:30,VoiceQ1,80,310`;
    processCsvText(hostileCsv);
  };

  const runCleaning = (
    rows: string[][],
    map: ColumnMapping,
    dupRule: 'FIRST' | 'LAST' | 'EXCLUDE_ALL'
  ) => {
    try {
      const result = cleanForecastDataset(rows, map, dupRule);
      setCleanedRecords(result.cleanedRecords);
      setCleaningReport(result.report);
    } catch (err: any) {
      alert(`Cleaning error: ${err.message}`);
    }
  };

  const handleConfirmAndProceed = () => {
    if (cleaningReport && cleanedRecords.length > 0) {
      onDatasetConfirmed(cleanedRecords, cleaningReport);
    }
  };

  const handleDownloadCleanedCsv = () => {
    if (cleanedRecords.length === 0) return;
    const lines = ['date,interval_start,queue,forecast_volume,forecast_aht'];
    for (const r of cleanedRecords) {
      lines.push(`${r.date},${r.intervalStart},${r.queueId},${r.volume},${r.ahtSec}`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    downloadBlob(blob, 'cleaned_fct_dataset.csv');
  };

  return (
    <div className="space-y-6">
      {/* Upload & Sample Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-sky-400" />
              Stage 1: FCT Data Ingestion & Column Mapping
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Upload your contact center volume & AHT CSV file, or load our pre-baked 1-week diurnal dataset.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition shadow">
              <Upload className="w-4 h-4" />
              <span>Choose CSV File</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={loadSampleDataset}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 px-3 py-2 rounded-lg text-xs font-semibold transition"
            >
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>Load 1-Week Voice FCT</span>
            </button>

            <button
              onClick={loadHostileTestDataset}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-3 py-2 rounded-lg text-xs font-semibold transition"
              title="Test PRD 6-step cleaner on negatives, duplicates, and AHT=0"
            >
              <AlertOctagon className="w-4 h-4 text-amber-400" />
              <span>Load Hostile CSV (Test 6-Step)</span>
            </button>
          </div>
        </div>

        {/* Column Mapping Selectors */}
        {headers.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Confirmed Column Mapping (RFC 4180 Ingestion)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Date', key: 'dateCol' as const },
                { label: 'Interval Start', key: 'intervalCol' as const },
                { label: 'Queue / Channel', key: 'queueCol' as const },
                { label: 'Forecast Volume', key: 'volumeCol' as const },
                { label: 'Forecast AHT (sec)', key: 'ahtCol' as const },
              ].map((field) => (
                <div key={field.key} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[11px] font-medium text-slate-400 mb-1">{field.label}</div>
                  <select
                    value={mapping[field.key]}
                    onChange={(e) => {
                      const newMap = { ...mapping, [field.key]: e.target.value };
                      setMapping(newMap);
                      runCleaning(rawRows, newMap, duplicateRule);
                    }}
                    className="w-full bg-slate-800 text-sky-300 text-xs rounded p-1.5 border border-slate-700 font-mono focus:outline-none"
                  >
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6-Step Cleaning Audit Report */}
      {cleaningReport && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                PRD Section 4.3 Validation & 6-Step Cleaning Report
              </h3>
              <p className="text-xs text-slate-400">
                Original file hash preserved. All transformations row-logged with deterministic fingerprint.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadCleanedCsv}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Export Cleaned CSV</span>
              </button>

              <button
                onClick={handleConfirmAndProceed}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-md transition"
              >
                <span>Confirm & Lock Forecast (S3)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Cleaning Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="text-xs text-slate-400">Accepted Intervals</div>
              <div className="text-2xl font-black text-white mt-1">
                {cleaningReport.acceptedRows}
                <span className="text-xs font-normal text-slate-500 ml-1">
                  / {cleaningReport.totalRowsRaw} raw
                </span>
              </div>
              <div className="text-[11px] text-emerald-400 mt-1">&#10004; Ready for Sizing</div>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="text-xs text-slate-400">Removed Negatives</div>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {cleaningReport.removedNegatives.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Logged with row & reason</div>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="text-xs text-slate-400">Exact Duplicates Removed</div>
              <div className="text-2xl font-black text-sky-400 mt-1">
                {cleaningReport.removedExactDuplicates}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">First occurrence preserved</div>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="text-xs text-slate-400">Zero AHT Quarantined</div>
              <div className="text-2xl font-black text-purple-400 mt-1">
                {cleaningReport.removedAhtZero.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Positive volume with AHT &le; 0</div>
            </div>
          </div>

          {/* Lineage Hashes */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] flex flex-wrap items-center justify-between gap-4 text-slate-400">
            <div>
              <span className="text-slate-500">Original File Hash: </span>
              <span className="text-sky-300 font-semibold">{cleaningReport.originalFileHash}</span>
            </div>
            <div>
              <span className="text-slate-500">Cleaned Dataset Hash: </span>
              <span className="text-emerald-300 font-semibold">{cleaningReport.cleanedDatasetHash}</span>
            </div>
            <div>
              <span className="text-slate-500">Fingerprint: </span>
              <span className="text-purple-300 font-semibold">{cleaningReport.fingerprint.slice(0, 16)}...</span>
            </div>
          </div>

          {/* Preview Table of Cleaned Data */}
          <div className="mt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Cleaned Forecast Sample (First 6 Intervals)
            </h4>
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Interval Start</th>
                    <th className="p-2.5">Queue</th>
                    <th className="p-2.5">Forecast Volume</th>
                    <th className="p-2.5">AHT (Seconds)</th>
                    <th className="p-2.5">Workload (Hours)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {cleanedRecords.slice(0, 6).map((rec, i) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="p-2.5 text-slate-300">{rec.date}</td>
                      <td className="p-2.5 text-sky-400 font-semibold">{rec.intervalStart}</td>
                      <td className="p-2.5 text-slate-400">{rec.queueId}</td>
                      <td className="p-2.5 text-white font-bold">{rec.volume}</td>
                      <td className="p-2.5 text-slate-300">{rec.ahtSec}s</td>
                      <td className="p-2.5 text-emerald-400">
                        {((rec.volume * rec.ahtSec) / 3600).toFixed(2)}h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
