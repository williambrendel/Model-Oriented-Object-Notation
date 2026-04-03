"use strict";

/**
 * @file resolveFixedLength.js
 * @module moon/utilities/resolveFixedLength
 * @description
 * Determines whether an array-typed field has a consistent fixed length
 * across multiple observed records.
 *
 * This utility inspects all array instances for a given field and returns
 * the shared length if every array has the same size. If lengths differ,
 * or no arrays are present, the field is considered variable-length.
 *
 * ## Behavior rules
 *
 * | Observed values                 | Result |
 * |--------------------------------|--------|
 * | `[ [1,2], [3,4] ]`              | `2`    |
 * | `[ [1], [2,3] ]`                | `null` |
 * | `[ [], [] ]`                    | `0`    |
 * | `[ null, undefined ]`           | `null` |
 * | `[ [1,2], null ]`               | `2`    |
 *
 * ## Design notes
 *
 * - Only actual arrays participate in length resolution.
 * - Non-array values are ignored.
 * - A single consistent length qualifies as fixed.
 * - Multiple distinct lengths imply variability.
 * - An empty set of arrays returns `null`.
 *
 * This function is intentionally simple and deterministic to support
 * stable schema inference behavior.
 *
 * @function resolveFixedLength
 *
 * @param {any[]} values
 * Observed field values across parent records.
 * May include arrays, nulls, or non-array values.
 *
 * @returns {number|null}
 * The shared fixed length, or `null` if lengths differ or no arrays exist.
 *
 * @example
 * resolveFixedLength([[1,2], [3,4]]);
 * // → 2
 *
 * @example
 * resolveFixedLength([[1], [2,3]]);
 * // → null
 *
 * @example
 * resolveFixedLength([null, undefined]);
 * // → null
 */
const resolveFixedLength = values => {
  const arrays = values.filter(Array.isArray);

  if (arrays.length === 0)
    return null;

  const lengths = new Set(arrays.map(a => a.length));

  return lengths.size === 1
    ? [...lengths][0]
    : null;
};

/**
 * @ignore
 * Default export with freezing.
 */
module.exports = Object.freeze(Object.defineProperty(resolveFixedLength, "resolveFixedLength", {
  value: resolveFixedLength
}));