/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PRD v7.1 Sample Datasets for WFM Planning & Testing
 * Realistic 1-week horizon contact center traffic profiles,
 * Multi-queue omnichannel data, and historical records for forecasting.
 */

import { IntervalForecastRecord, HistoryRecord } from '../types/wfm';

/**
 * Generates a realistic 7-day 30-minute interval FCT dataset (336 intervals)
 * with diurnal curves (peak at 10:00-11:30 and 14:00-15:30, lull at night, lower weekend volume).
 */
export function generateRealisticVoiceFct(): IntervalForecastRecord[] {
  const records: IntervalForecastRecord[] = [];
  const days = [
    { date: '2026-11-02', name: 'Mon', factor: 1.15 },
    { date: '2026-11-03', name: 'Tue', factor: 1.05 },
    { date: '2026-11-04', name: 'Wed', factor: 1.00 },
    { date: '2026-11-05', name: 'Thu', factor: 0.98 },
    { date: '2026-11-06', name: 'Fri', factor: 1.02 },
    { date: '2026-11-07', name: 'Sat', factor: 0.65 },
    { date: '2026-11-08', name: 'Sun', factor: 0.55 },
  ];

  for (const day of days) {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const hourFloat = h + m / 60;

        // Diurnal curve shape
        let baseVol = 5; // overnight minimum
        if (hourFloat >= 7 && hourFloat < 20) {
          // Daytime bell shapes
          const morningPeak = Math.exp(-Math.pow((hourFloat - 10.5) / 2.2, 2)) * 85;
          const afternoonPeak = Math.exp(-Math.pow((hourFloat - 14.8) / 2.5, 2)) * 70;
          baseVol = 15 + morningPeak + afternoonPeak;
        } else if (hourFloat >= 20 && hourFloat < 23) {
          baseVol = 20 - (hourFloat - 20) * 4;
        }

        const vol = Math.max(2, Math.round(baseVol * day.factor));
        // AHT is typically slightly longer during morning peak and evenings
        const aht = Math.round(270 + (hourFloat >= 9 && hourFloat <= 16 ? 30 : 0) + (hourFloat >= 20 ? 15 : 0));

        records.push({
          date: day.date,
          intervalStart: timeStr,
          intervalMinutes: 30,
          queueId: 'Voice_Primary',
          volume: vol,
          ahtSec: aht,
        });
      }
    }
  }

  return records;
}

/**
 * Returns CSV string for the realistic voice dataset
 */
export function getRealisticVoiceFctCsv(): string {
  const records = generateRealisticVoiceFct();
  const rows = ['date,interval_start,queue,forecast_volume,forecast_aht'];
  for (const r of records) {
    rows.push(`${r.date},${r.intervalStart},${r.queueId},${r.volume},${r.ahtSec}`);
  }
  return rows.join('\n');
}

/**
 * Generates sample historical data for forecasting module (4 weeks)
 */
export function generateSampleHistory(): HistoryRecord[] {
  const records: HistoryRecord[] = [];
  const startDay = new Date(2026, 9, 5); // Oct 5, 2026

  for (let d = 0; d < 28; d++) {
    const curDate = new Date(startDay);
    curDate.setDate(curDate.getDate() + d);
    const dateStr = curDate.toISOString().split('T')[0];
    const dayOfWeek = curDate.getDay();
    const dayFactor = dayOfWeek === 0 ? 0.55 : dayOfWeek === 6 ? 0.65 : dayOfWeek === 1 ? 1.15 : 1.0;

    for (let h = 8; h < 20; h++) {
      for (let m = 0; m < 60; m += 30) {
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const baseVol = 40 + Math.sin((h - 8) / 2) * 35;
        const vol = Math.max(5, Math.round(baseVol * dayFactor));
        const handled = Math.max(4, Math.round(vol * 0.96));
        const abandoned = vol - handled;

        records.push({
          date: dateStr,
          intervalStart: timeStr,
          intervalMinutes: 30,
          queueId: 'Voice_Primary',
          offeredVolume: vol,
          handledVolume: handled,
          ahtSec: 295,
          abandonedVolume: abandoned,
        });
      }
    }
  }

  return records;
}
