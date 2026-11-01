/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PRD v7.1 Constants Register
 * Section 2.1 Number Policy & Appendix A Numeric Register
 * All constants are named Class K with stated provenance.
 */

export const CONSTANTS_REGISTER = [
  { name: 'ZERO', value: 0, class: 'K', provenance: 'Identity / index start' },
  { name: 'ONE', value: 1, class: 'K', provenance: 'Unit / single indivisible seat' },
  { name: 'TWO', value: 2, class: 'K', provenance: 'Bisection and halving factor' },
  { name: 'HALF', value: 0.5, class: 'K', provenance: 'Midpoint factor' },
  { name: 'SECONDS_PER_MINUTE', value: 60, class: 'K', provenance: 'SI standard time unit' },
  { name: 'MINUTES_PER_HOUR', value: 60, class: 'K', provenance: 'SI standard time unit' },
  { name: 'SECONDS_PER_HOUR', value: 3600, class: 'K', provenance: '60 * 60 seconds' },
  { name: 'HOURS_PER_DAY', value: 24, class: 'K', provenance: 'Solar day standard hours' },
  { name: 'DAYS_PER_WEEK', value: 7, class: 'K', provenance: 'Calendar standard' },
  { name: 'GOLDEN_RATIO', value: 1.618033988749895, class: 'K', provenance: 'Golden section search constant' },
  { name: 'FLOAT64_SAFE_INTEGER_MAX', value: 9007199254740991, class: 'K', provenance: '2^53 - 1 exact integer limit' },
  { name: 'UNIFORM_NORM_21', value: 2097152, class: 'K', provenance: '2^21 multiplier for 53-bit float construction' },
  { name: 'UNIFORM_NORM_53', value: 9007199254740992, class: 'K', provenance: '2^53 divisor for open-interval uniform' },
  { name: 'HASH_MIXER_C1', value: 0xcc9e2d51, class: 'K', provenance: 'Murmur3 32-bit constant c1' },
  { name: 'HASH_MIXER_C2', value: 0x1b873593, class: 'K', provenance: 'Murmur3 32-bit constant c2' },
  { name: 'HASH_SEED_DEFAULT', value: 0x9747b28c, class: 'K', provenance: 'Standard deterministic hash seed' },
  { name: 'CRC32_POLYNOMIAL', value: 0xedb88320, class: 'K', provenance: 'ZIP/PKWARE spec' },
] as const;

export const K = {
  ZERO: 0,
  ONE: 1,
  TWO: 2,
  HALF: 0.5,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  SECONDS_PER_HOUR: 3600,
  HOURS_PER_DAY: 24,
  DAYS_PER_WEEK: 7,
  GOLDEN_RATIO: 1.618033988749895,
  FLOAT64_SAFE_INTEGER_MAX: 9007199254740991,
  UNIFORM_NORM_21: 2097152,
  UNIFORM_NORM_53: 9007199254740992,
  HASH_MIXER_C1: 0xcc9e2d51,
  HASH_MIXER_C2: 0x1b873593,
  HASH_SEED_DEFAULT: 0x9747b28c,
  CRC32_POLYNOMIAL: 0xedb88320,
} as const;

export function hashString128(input: string): string {
  let h1 = 0xdeadbeef ^ K.HASH_SEED_DEFAULT;
  let h2 = 0x41c6ce57 ^ K.HASH_SEED_DEFAULT;
  let h3 = 0x9e3779b9 ^ K.HASH_SEED_DEFAULT;
  let h4 = 0x85ebca6b ^ K.HASH_SEED_DEFAULT;

  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ (ch << 3), 1597334677);
    h3 = Math.imul(h3 ^ (ch << 7), 3812015801);
    h4 = Math.imul(h4 ^ (ch >> 2), 2246822507);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489909);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return `${hex(h1)}${hex(h2)}${hex(h3)}${hex(h4)}`;
}
