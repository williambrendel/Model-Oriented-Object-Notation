"use strict";

/**
 * @file isPureObject.js
 * @module moon/utilities/isPureObject
 * @description
 * Determines whether an object contains only primitive values.
 *
 * A "pure" object is defined as one whose property values are limited to:
 *
 * - string
 * - number
 * - boolean
 * - null
 * - undefined
 *
 * Any nested object or array makes the object impure.
 *
 * This utility is commonly used as a structural guard during schema
 * inference and serialization to detect when an object can be safely
 * treated as a flat primitive container rather than a nested structure.
 *
 * ## Behavior rules
 *
 * | Object value set                        | Result |
 * |----------------------------------------|--------|
 * | `{ a: 1, b: "x" }`                     | `true` |
 * | `{ a: null, b: undefined }`            | `true` |
 * | `{ a: {} }`                            | `false` |
 * | `{ a: [] }`                            | `false` |
 * | `{}`                                   | `true` |
 *
 * ## Design notes
 *
 * - The check is shallow (non-recursive).
 * - Only direct property values are evaluated.
 * - Empty objects are considered pure.
 * - Arrays always make the object impure.
 * - Functions are considered non-primitive and therefore impure.
 *
 * The implementation intentionally avoids recursion to preserve
 * predictable O(n) performance over property count.
 *
 * @function isPureObject
 *
 * @param {Object} obj
 * Object to evaluate.
 *
 * @returns {boolean}
 * `true` if all values are primitive, otherwise `false`.
 *
 * @example
 * isPureObject({ id: 1, name: "Alice" });
 * // → true
 *
 * @example
 * isPureObject({ profile: { age: 30 } });
 * // → false
 *
 * @example
 * isPureObject({});
 * // → true
 */
const isPureObject = obj => Object.values(obj).every(
  v => v === null || v === undefined || !(
    typeof v === "object" || typeof v === "function" || Array.isArray(v)
  )
);

/**
 * @ignore
 * Default export with freezing.
 */
module.exports = Object.freeze(Object.defineProperty(isPureObject, "isPureObject", {
  value: isPureObject
}));