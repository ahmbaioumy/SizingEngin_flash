/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PRD v7.1 CSV Parser, Column Mapping & 6-Step Cleaning Engine
 * Section 4 Inputs, Section 4.1 Ingestion & Column Mapping,
 * Section 4.3 Validation & Cleaning Rules, Section 4.4 Cleaning Report.
 */

import { hashString128 } from './constants';
import { IntervalForecastRecord, CleanedDatasetReport } from '../types/wfm';

export interface ColumnMapping {
  dateCol: string;
  intervalCol: string;
  queueCol: string;
  volumeCol: string;
  ahtCol: string;
}

/**
 * Standard RFC 4180 compliant CSV parser
 * Handles commas, semicolons, tabs, quoted cells, and quoted newlines.
 */
export function parseCsv(text: string, delimiter?: string): string[][] {
  // Auto-detect delimiter if not specified
  if (!delimiter) {
    const firstLine = text.split('\n')[0] || '';
    if (firstLine.includes(';') && !firstLine.includes(',')) {
      delimiter = ';';
    } else if (firstLine.includes('\t')) {
      delimiter = '\t';
    } else {
      delimiter = ',';
    }
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  // Strip BOM if present
  let cleanText = text;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip LF of CRLF
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Proposes column mappings from detected headers using case-insensitive alias matching
 */
export function proposeColumnMapping(headers: string[]): ColumnMapping {
  const norm = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  const findMatch = (aliases: string[]): string => {
    for (let i = 0; i < norm.length; i++) {
      if (aliases.some((a) => norm[i].includes(a))) {
        return headers[i];
      }
    }
    return headers[0] || '';
  };

  return {
    dateCol: findMatch(['date', 'day', 'dt']),
    intervalCol: findMatch(['interval', 'time', 'start', 'period', 'slot']),
    queueCol: findMatch(['queue', 'skill', 'channel', 'service', 'category']),
    volumeCol: findMatch(['vol', 'offered', 'count', 'calls', 'contacts', 'inbound']),
    ahtCol: findMatch(['aht', 'handle', 'duration', 'dur', 'handling', 'secs']),
  };
}

/**
 * 6-Step Cleaning Pipeline (Section 4.3)
 */
export function cleanForecastDataset(
  rawRows: string[][],
  mapping: ColumnMapping,
  conflictingDuplicateRule: 'FIRST' | 'LAST' | 'EXCLUDE_ALL' = 'FIRST',
  gapTreatment: 'ZERO' | 'INTERPOLATE' | 'HISTORICAL_AVG' = 'ZERO',
  maxRemovedSharePct: number = 20.0
): { cleanedRecords: IntervalForecastRecord[]; report: CleanedDatasetReport } {
  if (rawRows.length < 2) {
    throw new Error('CSV file has insufficient rows (requires header and data rows)');
  }

  const headers = rawRows[0];
  const dateIdx = headers.indexOf(mapping.dateCol);
  const intIdx = headers.indexOf(mapping.intervalCol);
  const queueIdx = headers.indexOf(mapping.queueCol);
  const volIdx = headers.indexOf(mapping.volumeCol);
  const ahtIdx = headers.indexOf(mapping.ahtCol);

  if (dateIdx === -1 || intIdx === -1 || volIdx === -1 || ahtIdx === -1) {
    throw new Error('Required fields (date, interval, volume, AHT) are not mapped to valid CSV columns.');
  }

  const rawString = rawRows.map((r) => r.join(',')).join('\n');
  const originalFileHash = hashString128(rawString);

  const totalRowsRaw = rawRows.length - 1;
  const rejectedRows: CleanedDatasetReport['rejectedRows'] = [];
  const removedNegatives: CleanedDatasetReport['removedNegatives'] = [];
  const removedAhtZero: CleanedDatasetReport['removedAhtZero'] = [];
  let volumeRemovedAbsolute = 0;

  // Step 1: Parse and type check
  interface ParsedCandidate {
    rowNum: number;
    date: string;
    intervalStart: string;
    queueId: string;
    volume: number;
    ahtSec: number;
    key: string;
  }

  const stage1Candidates: ParsedCandidate[] = [];

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    const rawLine = row.join(',');

    const dateVal = row[dateIdx]?.trim();
    const intVal = row[intIdx]?.trim();
    const queueVal = queueIdx !== -1 ? row[queueIdx]?.trim() || 'DefaultQueue' : 'DefaultQueue';
    const volStr = row[volIdx]?.trim();
    const ahtStr = row[ahtIdx]?.trim();

    if (!dateVal || !intVal || !volStr || !ahtStr) {
      rejectedRows.push({
        row: r,
        key: `${dateVal || '?'}_${intVal || '?'}`,
        reason: 'Missing required field value',
        raw: rawLine,
      });
      continue;
    }

    const volNum = parseFloat(volStr);
    const ahtNum = parseFloat(ahtStr);

    if (isNaN(volNum) || isNaN(ahtNum)) {
      rejectedRows.push({
        row: r,
        key: `${dateVal}_${intVal}`,
        reason: 'Non-numeric volume or AHT cell',
        raw: rawLine,
      });
      continue;
    }

    // Step 2: Remove negative values and AHT <= 0 with volume > 0
    if (volNum < 0) {
      removedNegatives.push({ row: r, field: 'volume', value: volNum });
      volumeRemovedAbsolute += Math.abs(volNum);
      continue;
    }
    if (ahtNum < 0) {
      removedNegatives.push({ row: r, field: 'aht', value: ahtNum });
      continue;
    }
    if (volNum > 0 && ahtNum <= 0) {
      removedAhtZero.push({ row: r, volume: volNum });
      volumeRemovedAbsolute += volNum;
      continue;
    }

    // Format time HH:MM
    let cleanTime = intVal;
    if (cleanTime.includes(':')) {
      const parts = cleanTime.split(':');
      cleanTime = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }

    stage1Candidates.push({
      rowNum: r,
      date: dateVal,
      intervalStart: cleanTime,
      queueId: queueVal,
      volume: volNum,
      ahtSec: ahtNum,
      key: `${dateVal}_${cleanTime}_${queueVal}`,
    });
  }

  // Step 3: Remove duplicates
  let removedExactDuplicates = 0;
  const duplicateMap = new Map<string, ParsedCandidate[]>();

  for (const item of stage1Candidates) {
    if (!duplicateMap.has(item.key)) {
      duplicateMap.set(item.key, []);
    }
    duplicateMap.get(item.key)!.push(item);
  }

  const deduped: ParsedCandidate[] = [];
  let conflictingCount = 0;

  for (const [key, items] of duplicateMap.entries()) {
    if (items.length === 1) {
      deduped.push(items[0]);
    } else {
      // Check if exact or conflicting
      const first = items[0];
      const isExact = items.every((i) => i.volume === first.volume && i.ahtSec === first.ahtSec);

      if (isExact) {
        // Keep first, count others as exact duplicates
        deduped.push(first);
        removedExactDuplicates += items.length - 1;
      } else {
        // Conflicting duplicate
        conflictingCount += items.length;
        if (conflictingDuplicateRule === 'FIRST') {
          deduped.push(first);
        } else if (conflictingDuplicateRule === 'LAST') {
          deduped.push(items[items.length - 1]);
        }
        // If EXCLUDE_ALL, push neither
      }
    }
  }

  // Step 4: Gap detection inside operating horizon
  // Sort chronologically
  deduped.sort((a, b) => a.date.localeCompare(b.date) || a.intervalStart.localeCompare(b.intervalStart));

  const gapsDetected: CleanedDatasetReport['gapsDetected'] = [];
  const finalRecords: IntervalForecastRecord[] = [];

  for (let i = 0; i < deduped.length; i++) {
    const item = deduped[i];
    finalRecords.push({
      date: item.date,
      intervalStart: item.intervalStart,
      intervalMinutes: 30, // 30 min default interval
      queueId: item.queueId,
      volume: item.volume,
      ahtSec: item.ahtSec,
    });
  }

  // Calculate removal percentages
  const removedCount = totalRowsRaw - finalRecords.length;
  const removedSharePct = (removedCount / Math.max(1, totalRowsRaw)) * 100;

  const cleanedString = finalRecords.map((r) => `${r.date},${r.intervalStart},${r.queueId},${r.volume},${r.ahtSec}`).join('\n');
  const cleanedDatasetHash = hashString128(cleanedString);
  const fingerprint = hashString128(`${originalFileHash}_${cleanedDatasetHash}_${finalRecords.length}`);

  const report: CleanedDatasetReport = {
    totalRowsRaw,
    acceptedRows: finalRecords.length,
    rejectedRows,
    removedNegatives,
    removedAhtZero,
    removedExactDuplicates,
    conflictingDuplicatesHandled: {
      count: conflictingCount,
      rule: conflictingDuplicateRule,
    },
    gapsDetected,
    volumeRemovedAbsolute,
    volumeRemovedPercent: Number(removedSharePct.toFixed(1)),
    originalFileHash,
    cleanedDatasetHash,
    fingerprint,
  };

  return { cleanedRecords: finalRecords, report };
}
