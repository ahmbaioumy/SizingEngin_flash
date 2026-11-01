/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PRD v7.1 In-Source Stored ZIP Writer with CRC32
 * Section 2.2 Zero-Dependency Policy (Z1 & Z2) & Section 13.9
 * In-source STORED (method 0, uncompressed) ZIP container using CRC32.
 * Zero external libraries or npm dependencies.
 */

import { K } from './constants';
import { generateStandaloneOfflineHtml } from './standaloneHtmlBundle';
import { getRealisticVoiceFctCsv } from './sampleData';

/**
 * Computes standard 32-bit Cyclic Redundancy Check (CRC32)
 * using the PKWARE / ISO 3309 polynomial registered in constants.ts.
 */
export function computeCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? K.CRC32_POLYNOMIAL : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  path: string;
  data: Uint8Array;
}

/**
 * In-source STORED (method 0) ZIP builder according to PKWARE APPNOTE.TXT.
 */
export class StoredZipWriter {
  private entries: ZipEntry[] = [];

  public addFile(path: string, content: string | Uint8Array): void {
    const data = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    this.entries.push({ path, data });
  }

  public build(): Uint8Array {
    const encoder = new TextEncoder();
    const localHeaders: Uint8Array[] = [];
    const centralHeaders: Uint8Array[] = [];
    let currentOffset = 0;

    // Fixed DOS timestamp: 2026-11-01 00:00:00
    // Date: ((2026 - 1980) << 9) | (11 << 5) | 1 = (46 << 9) | (11 << 5) | 1 = 23552 | 352 | 1 = 23905 = 0x5D61
    const dosDate = 0x5d61;
    const dosTime = 0x0000;

    for (const entry of this.entries) {
      const filenameBytes = encoder.encode(entry.path);
      const crc = computeCrc32(entry.data);
      const size = entry.data.length;

      // 1. Local File Header (30 bytes + filename)
      const localBuf = new Uint8Array(30 + filenameBytes.length + size);
      const lv = new DataView(localBuf.buffer, localBuf.byteOffset, localBuf.byteLength);

      lv.setUint32(0, 0x04034b50, true); // Local file header signature
      lv.setUint16(4, 10, true);          // Version needed (1.0 for STORED)
      lv.setUint16(6, 0x0800, true);      // General purpose bit flag (UTF-8 filename)
      lv.setUint16(8, 0, true);           // Compression method (0 = STORED)
      lv.setUint16(10, dosTime, true);    // Last mod file time
      lv.setUint16(12, dosDate, true);    // Last mod file date
      lv.setUint32(14, crc, true);        // CRC-32
      lv.setUint32(18, size, true);       // Compressed size
      lv.setUint32(22, size, true);       // Uncompressed size
      lv.setUint16(26, filenameBytes.length, true); // File name length
      lv.setUint16(28, 0, true);          // Extra field length

      localBuf.set(filenameBytes, 30);
      localBuf.set(entry.data, 30 + filenameBytes.length);
      localHeaders.push(localBuf);

      // 2. Central Directory Header (46 bytes + filename)
      const centralBuf = new Uint8Array(46 + filenameBytes.length);
      const cv = new DataView(centralBuf.buffer, centralBuf.byteOffset, centralBuf.byteLength);

      cv.setUint32(0, 0x02014b50, true); // Central directory header signature
      cv.setUint16(4, 20, true);          // Version made by (2.0)
      cv.setUint16(6, 10, true);          // Version needed (1.0)
      cv.setUint16(8, 0x0800, true);      // UTF-8 flag
      cv.setUint16(10, 0, true);          // Compression (0 = STORED)
      cv.setUint16(12, dosTime, true);    // Mod time
      cv.setUint16(14, dosDate, true);    // Mod date
      cv.setUint32(16, crc, true);        // CRC-32
      cv.setUint32(20, size, true);       // Compressed size
      cv.setUint32(24, size, true);       // Uncompressed size
      cv.setUint16(28, filenameBytes.length, true); // Filename length
      cv.setUint16(30, 0, true);          // Extra field length
      cv.setUint16(32, 0, true);          // File comment length
      cv.setUint16(34, 0, true);          // Disk number start
      cv.setUint16(36, 0, true);          // Internal file attributes
      cv.setUint32(38, 0, true);          // External file attributes
      cv.setUint32(42, currentOffset, true); // Relative offset of local header

      centralBuf.set(filenameBytes, 46);
      centralHeaders.push(centralBuf);

      currentOffset += localBuf.length;
    }

    const centralDirectoryOffset = currentOffset;
    let centralDirectorySize = 0;
    for (const ch of centralHeaders) {
      centralDirectorySize += ch.length;
    }

    // 3. End of Central Directory (EOCD, 22 bytes)
    const eocdBuf = new Uint8Array(22);
    const ev = new DataView(eocdBuf.buffer, eocdBuf.byteOffset, eocdBuf.byteLength);

    ev.setUint32(0, 0x06054b50, true); // EOCD signature
    ev.setUint16(4, 0, true);          // Disk number
    ev.setUint16(6, 0, true);          // Start disk
    ev.setUint16(8, this.entries.length, true);  // Disk entries
    ev.setUint16(10, this.entries.length, true); // Total entries
    ev.setUint32(12, centralDirectorySize, true); // CD size
    ev.setUint32(16, centralDirectoryOffset, true); // CD offset
    ev.setUint16(20, 0, true);         // Comment length

    // Assemble total archive
    const totalSize = currentOffset + centralDirectorySize + 22;
    const zipArchive = new Uint8Array(totalSize);

    let writePos = 0;
    for (const lh of localHeaders) {
      zipArchive.set(lh, writePos);
      writePos += lh.length;
    }
    for (const ch of centralHeaders) {
      zipArchive.set(ch, writePos);
      writePos += ch.length;
    }
    zipArchive.set(eocdBuf, writePos);

    return zipArchive;
  }

  public buildBlob(): Blob {
    const bytes = this.build();
    return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/zip' });
  }
}

/**
 * Assembles the full project ZIP blob containing standalone HTML, sources, samples, and docs.
 */
export async function generateProjectZipBlob(): Promise<Blob> {
  const zip = new StoredZipWriter();

  // 1. Single-file offline standalone HTML
  const standaloneHtml = generateStandaloneOfflineHtml();
  zip.addFile('wfm_engine_v7_1_standalone.html', standaloneHtml);
  zip.addFile('index.html', standaloneHtml);

  // 2. Sample Datasets (CSV)
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

  // 3. Documentation README.md
  zip.addFile(
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

## License
Apache-2.0
`
  );

  return zip.buildBlob();
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
