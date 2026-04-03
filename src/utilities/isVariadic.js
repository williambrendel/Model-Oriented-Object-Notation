"use strict";

const { VARIADIC_MAX_FREQUENCY } = require("../constants");

/**
 * @file isVariadic.js
 * @module moon/utilities/isVariadic
 * @description Determines whether a field should be treated as variadic
 * (omitted from schema, emitted as `key=value` only when present) based on
 * its presence frequency, key length, and total record count.
 *
 * ## Two-tier decision
 *
 * **Tier 1 — Floor check:**
 * If `frequency < variadicMaxFrequency`, the field is always variadic regardless
 * of key length or record count. Fast path.
 *
 * **Tier 2 — Break-even formula:**
 * For fields above the floor, computes whether emitting `key=value` only when
 * present is cheaper than emitting `~` on every absent row, accounting for
 * dataset size.
 *
 * The exact cost model:
 * ```
 * declared cost:  n×(1-f) × 1          (~ per absent row)
 * variadic cost:  n×f × (keyLength+1)   (key=separator per present row)
 * ```
 * Value length cancels — paid the same either way when the field is present.
 * Schema declaration cost difference: keyLength - 3 (key chars vs `...`),
 * but this is small and absorbed into the n-aware correction.
 *
 * Break-even (exact, n-aware):
 * ```
 * f < (n + keyLength + 1) / (n × (keyLength + 1))
 *   = 1/(keyLength+1) + 1/n
 * ```
 *
 * As n→∞ this converges to `1/(keyLength+1)`.
 * For small n the `1/n` correction keeps more fields declared — correct,
 * since the schema declaration cost dominates at small record counts.
 *
 * | Key length | Break-even (n=5) | Break-even (n→∞) |
 * |------------|-----------------|-----------------|
 * | 2 chars    | 0.53            | 0.33            |
 * | 4 chars    | 0.40            | 0.20            |
 * | 5 chars    | 0.37            | 0.17            |
 * | 8 chars    | 0.31            | 0.11            |
 * | 16 chars   | 0.26            | 0.06            |
 *
 * ## Examples (n=5, variadicMaxFrequency=0.2)
 *
 * - `note` (4 chars) at f=0.40: break-even=(5+4+1)/(5×5)=0.40 → 0.40 < 0.40 false → **declared**
 * - `badge` (5 chars) at f=0.20: break-even=(5+5+1)/(5×6)≈0.37 → 0.20 < 0.37 → **variadic**
 * - `role` (4 chars) at f=1.0: break-even=0.40 → 1.0 < 0.40 false → **declared**
 */

/**
 * Determines whether a field should be variadic based on presence frequency,
 * key length, and total record count.
 *
 * @function isVariadic
 * @param {string} key                      - The field name.
 * @param {number} frequency                - Non-null presence frequency 0..1.
 * @param {number} [n=Infinity]             - Total record count. Pass the actual
 *   count for accurate small-dataset decisions. Defaults to large-n approximation.
 * @param {number} [variadicMaxFrequency]   - Floor threshold.
 * @returns {boolean} True if the field should be variadic.
 *
 * @example
 * isVariadic("badge", 0.20, 5);        // → true  (variadic — saves tokens)
 * isVariadic("note",  0.40, 5);        // → false (declared — break-even at 0.40)
 * isVariadic("role",  1.00, 5);        // → false (always present — declared)
 * isVariadic("x",     0.05, 5);        // → true  (below floor)
 */
const isVariadic = (key, frequency, n = Infinity, variadicMaxFrequency = VARIADIC_MAX_FREQUENCY) => (
  // Tier 1: floor check — always variadic below the threshold
  frequency < variadicMaxFrequency
  // Tier 2: break-even formula
  // For large n, use the asymptotic approximation: f < 1/(keyLength+1)
  // For finite n, use the exact formula: f < (n + keyLength + 1) / (n × (keyLength + 1))
  || (n === Infinity && frequency < 1 / (key.length + 1))
  || (
    n > 0 || (n = 1),
    frequency < (n + key.length - 2) / (n * (key.length + 1))
  )
)

/**
 * @ignore
 * Default export with freezing.
 */
module.exports = Object.freeze(Object.defineProperty(isVariadic, "isVariadic", {
  value: isVariadic
}));