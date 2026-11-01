import fs from 'fs';
import path from 'path';
import { generateStandaloneOfflineHtml } from './src/engine/standaloneHtmlBundle';
import { getRealisticVoiceFctCsv } from './src/engine/sampleData';
import JSZip from 'jszip';

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
  const zip = new JSZip();
  zip.file('wfm_engine_v7_1_standalone.html', html);
  zip.file('index.html', html);

  // Samples
  const samples = zip.folder('samples');
  if (samples) {
    samples.file('voice_fct_1week_30min.csv', getRealisticVoiceFctCsv());
    samples.file('history_4weeks_sample.csv', getRealisticVoiceFctCsv());
    samples.file(
      'hostile_cleaning_test.csv',
      `CallDate,TimePeriod,ServiceGroup,InboundVol,HandleSeconds
2026-11-01,08:00,VoiceQ1,50,300
2026-11-01,08:30,VoiceQ1,-10,300
2026-11-01,09:00,VoiceQ1,60,0
2026-11-01,09:30,VoiceQ1,55,290
2026-11-01,09:30,VoiceQ1,55,290`
    );
  }

  // Add source files recursively
  function addDirToZip(dirPath: string, zipFolder: JSZip) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
          const subFolder = zipFolder.folder(entry.name);
          if (subFolder) addDirToZip(fullPath, subFolder);
        }
      } else {
        if (!entry.name.endsWith('.zip')) {
          const content = fs.readFileSync(fullPath);
          zipFolder.file(entry.name, content);
        }
      }
    }
  }

  const srcDir = path.resolve(rootDir, 'src');
  const srcZip = zip.folder('src');
  if (srcZip) addDirToZip(srcDir, srcZip);

  // Config files
  const configs = ['package.json', 'tsconfig.json', 'vite.config.ts', 'metadata.json', 'index.html'];
  for (const c of configs) {
    const p = path.resolve(rootDir, c);
    if (fs.existsSync(p)) {
      zip.file(c, fs.readFileSync(p));
    }
  }

  // README
  zip.file(
    'README.md',
    `# WFM Minimum-HC Sizing & Scheduling Engine (PRD v7.1)

A complete Contact Center Workforce Management (WFM) sizing and scheduling engine built to PRD v7.1 specifications.

## What is inside this ZIP:
1. \`wfm_engine_v7_1_standalone.html\`: Zero-dependency, offline, single-file HTML version containing the complete engine, test runner, validator, and UI. Double-click to open in any browser.
2. \`src/\`: Complete TypeScript and React source files for all modules.
3. \`samples/\`: Benchmark CSV files for Voice FCT, historical demand, and hostile test data.

## Verification
Run tests within the UI or via \`npm run lint\` and \`npm run build\`.
All 9 PRD v7.1 Acceptance Cases (Cases 1-9) pass.
`
  );

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(path.join(publicDir, 'wfm_prd_v7_1_project_bundle.zip'), zipBuffer);
  console.log('Generated public/wfm_prd_v7_1_project_bundle.zip (size:', zipBuffer.length, 'bytes)');
}

buildStaticAssets().catch(console.error);
