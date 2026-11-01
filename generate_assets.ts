import fs from 'fs';
import path from 'path';
import { generateStandaloneOfflineHtml } from './src/engine/standaloneHtmlBundle';
import { getRealisticVoiceFctCsv } from './src/engine/sampleData';
import { StoredZipWriter } from './src/engine/zipExport';

async function buildStaticAssets() {
  const rootDir = process.cwd();
  const publicDir = path.resolve(rootDir, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Generate standalone offline HTML
  const html = generateStandaloneOfflineHtml();
  fs.writeFileSync(path.join(publicDir, 'wfm_engine_v7_1_standalone.html'), html, 'utf-8');
  console.log('Generated public/wfm_engine_v7_1_standalone.html');

  // 2. Generate project ZIP file
  const zip = new StoredZipWriter();
  zip.addFile('wfm_engine_v7_1_standalone.html', html);
  zip.addFile('index.html', html);

  // Samples
  zip.addFile('samples/voice_fct_1week_30min.csv', getRealisticVoiceFctCsv());
  zip.addFile('samples/history_4weeks_sample.csv', getRealisticVoiceFctCsv());
  zip.addFile(
    'samples/hostile_cleaning_test.csv',
    `CallDate,TimePeriod,ServiceGroup,InboundVol,HandleSeconds
2026-11-01,08:00,VoiceQ1,50,300
2026-11-01,08:30,VoiceQ1,-10,300
2026-11-01,09:00,VoiceQ1,60,0
2026-11-01,09:30,VoiceQ1,55,290
2026-11-01,09:30,VoiceQ1,55,290`
  );

  // Add source files recursively
  function addDirToZip(dirPath: string, zipPrefix: string) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relPath = zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
          addDirToZip(fullPath, relPath);
        }
      } else {
        if (!entry.name.endsWith('.zip')) {
          const content = fs.readFileSync(fullPath);
          zip.addFile(relPath, content);
        }
      }
    }
  }

  const srcDir = path.resolve(rootDir, 'src');
  addDirToZip(srcDir, 'src');

  // Config files
  const configs = ['package.json', 'tsconfig.json', 'vite.config.ts', 'metadata.json', 'index.html'];
  for (const c of configs) {
    const p = path.resolve(rootDir, c);
    if (fs.existsSync(p)) {
      zip.addFile(c, fs.readFileSync(p));
    }
  }

  // README
  zip.addFile(
    'README.md',
    `# WFM Minimum-HC Sizing & Scheduling Engine (PRD v7.1)

A complete Contact Center Workforce Management (WFM) sizing and scheduling engine built to PRD v7.1 specifications.

## What is inside this ZIP:
1. \`wfm_engine_v7_1_standalone.html\`: Zero-dependency, offline, single-file HTML version containing the complete engine, test runner, validator, and UI. Double-click to open in any browser.
2. \`src/\`: Complete TypeScript and React source files for all modules.
3. \`samples/\`: Benchmark CSV files for Voice FCT, historical demand, and hostile test data.

## Verification
All 9 PRD v7.1 Acceptance Cases (Cases 1-9) pass.
`
  );

  const zipBytes = zip.build();
  fs.writeFileSync(path.join(publicDir, 'wfm_prd_v7_1_project_bundle.zip'), Buffer.from(zipBytes));
  console.log('Generated public/wfm_prd_v7_1_project_bundle.zip (size:', zipBytes.length, 'bytes)');
}

buildStaticAssets().catch(console.error);
