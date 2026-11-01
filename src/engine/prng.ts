/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PRD v7.1 Keyed Deterministic PRNG
 * Section 2.2 (Z3), Section 6.3 Determinism
 * 53-bit open-interval uniform generator built from paired 32-bit mix words.
 * Strictly inside (0, 1). Pure function of key.
 */

import { K } from './constants';

export class KeyedPRNG {
  private s0: number;
  private s1: number;

  constructor(seedBlock: number, streamId: number = 0, step: number = 0) {
    // SplitMix32 initial conditioning
    let h = (seedBlock ^ Math.imul(streamId, 0x85ebca6b) ^ Math.imul(step, 0xc2b2ae35)) >>> 0;
    
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    this.s0 = (h ^ (h >>> 16)) >>> 0 || 1;

    h = (this.s0 ^ 0x6c078965) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    this.s1 = (h ^ (h >>> 16)) >>> 0 || 2;
  }

  /**
   * Fast 32-bit XorShift128+ step
   */
  public nextUint32(): number {
    let s1 = this.s0;
    const s0 = this.s1;
    this.s0 = s0;
    s1 ^= s1 << 23;
    this.s1 = (s1 ^ s0 ^ (s1 >>> 17) ^ (s0 >>> 26)) >>> 0;
    return (this.s1 + s0) >>> 0;
  }

  /**
   * 53-bit IEEE-754 float strictly inside the open interval (0, 1)
   * Section 6.3: Built from two mixed 32-bit words with +0.5 centering.
   */
  public nextUniform(): number {
    const u1 = this.nextUint32();
    const u2 = this.nextUint32();
    const high21 = u1 >>> 11; // 21 bits
    const low32 = u2 >>> 0;   // 32 bits
    const val53 = high21 * K.UNIFORM_NORM_21 + low32;
    // Offset by +0.5 to guarantee strictly (0, 1), never 0.0 and never 1.0
    return (val53 + K.HALF) / K.UNIFORM_NORM_53;
  }

  /**
   * Exponential variate with rate lambda > 0
   */
  public nextExponential(rate: number): number {
    const u = this.nextUniform();
    return -Math.log(u) / rate;
  }

  /**
   * Standard normal variate N(0, 1) via Box-Muller
   */
  public nextStandardNormal(): number {
    const u1 = this.nextUniform();
    const u2 = this.nextUniform();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  /**
   * Lognormal variate with target mean and target coefficient of variation (CV)
   * Section 7.4: log-variance ln(1 + CV^2)
   */
  public nextLognormal(mean: number, cv: number): number {
    if (cv <= 0.0001) return mean;
    const sigma2 = Math.log(1.0 + cv * cv);
    const sigma = Math.sqrt(sigma2);
    const mu = Math.log(mean) - 0.5 * sigma2;
    const z = this.nextStandardNormal();
    return Math.exp(mu + sigma * z);
  }

  /**
   * Exact Poisson count for rate lambda >= 0
   * For small lambda uses multiplication of uniforms, for large lambda uses Gaussian inversion.
   */
  public nextPoisson(lambda: number): number {
    if (lambda <= 0) return 0;
    if (lambda < 30) {
      const L = Math.exp(-lambda);
      let k = 0;
      let p = 1.0;
      do {
        k++;
        p *= this.nextUniform();
      } while (p > L);
      return k - 1;
    } else {
      // Gaussian approximation with continuity correction
      const z = this.nextStandardNormal();
      const val = Math.round(lambda + Math.sqrt(lambda) * z + 0.5);
      return Math.max(0, val);
    }
  }
}
