"use strict";

const { VARIADIC_MAX_FREQUENCY } = require("../constants");

/**
 * @file isVariadic.js
 * @module moon/utilities/isVariadic
 * @description Determines whether a field should be treated as variadic
 * (omitted from schema, emitted as `key=value` only when present) based on
 * its presence frequency and key length.
 *
 * ## Two-tier decision
 *
 * **Tier 1 — Floor check:**
 * If `frequency < variadicMaxFrequency`, the field is always variadic regardless
 * of key length. Fast path — no formula needed.
 *
 * **Tier 2 — Break-even formula:**
 * For fields above the floor, computes whether emitting `key=value` only when
 * present is cheaper than emitting `~` on every absent row.
 *
 * Break-even condition (derived from token cost model):
 * ```
 * absent_rows × NULL_COST  vs  present_rows × (keyLength + SEP_COST)
 * n×(1-f) × 1  vs  n×f × (keyLength + 1)
 * → variadic when: f < 1 / (keyLength + 2)
 * ```
 *
 * | Key length | Break-even frequency |
 * |------------|---------------------|
 * | 2 chars    | 0.33                |
 * | 4 chars    | 0.17                |
 * | 6 chars    | 0.13                |
 * | 8 chars    | 0.10                |
 * | 16 chars   | 0.056               |
 *
 * ## Example
 *
 * Given `variadicMaxFrequency = 0.2`:
 * - `note` (4 chars) at f=0.40: floor=false, break-even=0.17 → 0.40 > 0.17 → **declared**
 * - `badge` (5 chars) at f=0.20: floor=false, break-even=0.14 → 0.20 > 0.14 → **declared**
 * - `badge` (5 chars) at f=0.10: floor=true (0.10 < 0.2) → **variadic**
 * - `x` (1 char) at f=0.25: floor=false, break-even=0.33 → 0.25 < 0.33 → **variadic**
 *
 * @example
 * isVariadic("note", 0.40); // → false (declared — cheaper to emit ~)
 * isVariadic("badge", 0.10); // → true  (variadic — below floor)
 * isVariadic("x", 0.25);    // → true  (variadic — short key, break-even wins)
 */

/**
 * Determines whether a field should be variadic based on presence frequency
 * and key length.
 *
 * @function isVariadic
 * @param {string} key                      - The field name.
 * @param {number} frequency                - Non-null presence frequency 0..1.
 * @param {number} [variadicMaxFrequency]   - Floor threshold. Defaults to
 *   `VARIADIC_MAX_FREQUENCY` from constants.
 * @returns {boolean} True if the field should be variadic.
 *
 * @example
 * isVariadic("note",  0.40); // → false
 * isVariadic("note",  0.10); // → true
 * isVariadic("x",     0.25); // → true  (break-even: 1/(1+2) = 0.33 > 0.25)
 * isVariadic("badge", 0.20); // → false (break-even: 1/(5+2) = 0.14 < 0.20)
 */
const isVariadic = (key, frequency, variadicMaxFrequency = VARIADIC_MAX_FREQUENCY) => {
  // Tier 1: floor check — always variadic below the threshold
  if (frequency < variadicMaxFrequency) return true;

  // Tier 2: break-even formula — variadic if null-emission cost exceeds key=value cost
  // Break-even: f < 1 / (keyLength + 2)
  const breakEven = 1 / (key.length + 2);
  return frequency < breakEven;
};

module.exports = Object.freeze(Object.defineProperty(isVariadic, "isVariadic", {
  value: isVariadic
}));