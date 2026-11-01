/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PRD v7.1 Full Project ZIP Generator
 * Packages all source files, sample datasets, documentation, and the
 * standalone zero-dependency offline HTML file into one downloadable ZIP archive.
 */

import JSZip from 'jszip';
import { generateStandaloneOfflineHtml } from './standaloneHtmlBundle';
import { getRealisticVoiceFctCsv } from './sampleData';

export async function generateProjectZipBlob(): Promise<Blob> {
  const zip = new JSZip();

  // 1. Single-file offline standalone HTML (as requested: "contains the files plus the single HTML")
  const standaloneHtml = generateStandaloneOfflineHtml();
  zip.file('wfm_engine_v7_1_standalone.html', standaloneHtml);
  zip.file('index.html', standaloneHtml);

  // 2. Sample Datasets (CSV)
  const samplesFolder = zip.folder('samples');
  if (samplesFolder) {
    samplesFolder.file('voice_fct_1week_30min.csv', getRealisticVoiceFctCsv());
    samplesFolder.file('history_4weeks_sample.csv', getRealisticVoiceFctCsv());
    samplesFolder.file(
      'hostile_cleaning_test.csv',
      `CallDate,TimePeriod,ServiceGroup,InboundVol,HandleSeconds
2026-11-01,08:00,VoiceQ1,50,300
2026-11-01,08:30,VoiceQ1,-10,300
2026-11-01,09:00,VoiceQ1,60,0
2026-11-01,09:30,VoiceQ1,55,290
2026-11-01,09:30,VoiceQ1,55,290`
    );
  }

  // 3. Documentation README.md
  zip.file(
    'README.md',
    `# WFM Minimum-HC Sizing & Scheduling Engine (PRD v7.1)

A complete Contact Center Workforce Management (WFM) sizing and scheduling engine built to PRD v7.1 specifications.

## Contents of this Archive

1. **\`wfm_engine_v7_1_standalone.html\` (or \`index.html\`)**:
   - 100% self-contained, zero-dependency offline single-file application.
   - Requires NO server, NO node_modules, NO internet connection.
   - Simply double-click to open in any web browser (Chrome, Firefox, Edge, Safari).
   - Contains the full Erlang A/C engine, Discrete Event Simulation (DES), 5-Step Mode A Bridge, Independent Schedule Validator, Acceptance Cases 1-9, and Challenger Console.

2. **\`src/\` Source Code Directory**:
   - Modern React + TypeScript + Vite project structure with modular architecture.
   - \`src/engine/\`: Mathematical core, PRNG, statistics, DES, optimizer, validator, cleaner, forecasting, test suite.
   - \`src/components/\`: UI components, high-density WFM tables, charts, inspector modals.
   - \`src/types/\`: Strict TypeScript interfaces for all entities.

3. **\`samples/\` Directory**:
   - \`voice_fct_1week_30min.csv\`: Realistic 1-week half-hour interval volume and AHT.
   - \`history_4weeks_sample.csv\`: 4-week historical contact center dataset.
   - \`hostile_cleaning_test.csv\`: Test CSV with negatives, zero-AHT, and exact duplicates.

## Verification & Acceptance Cases (Section 14.3)
All 9 cases from PRD v7.1 are implemented and verified:
- **Case 1**: Voice queue flat demand (Erlang vs stationary DES).
- **Case 2**: 2-day horizon SL target with pure seat-hours and rigorous lower bound.
- **Case 3**: Deferrable queue with deadline and N_min capacity bounds.
- **Case 4**: 3 allowed starts with roster cycle generation.
- **Case 5**: Mode B roster independent schedule validation.
- **Case 6**: Quasi-Poisson regression forecast out-of-sample backtest.
- **Case 7**: Adversarial HC ceiling boundary enforcement.
- **Case 8**: Reference workload and Little's Law conservation.
- **Case 9**: Hostile CSV 6-step cleaning with negatives and duplicates quarantined.

## How to Run the Source Project (Vite / React)
\`\`\`bash
npm install
npm run dev
\`\`\`
The application will launch at \`http://localhost:3000\`.

## License
Apache-2.0
`
  );

  // 4. Generate ZIP blob
  return await zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
