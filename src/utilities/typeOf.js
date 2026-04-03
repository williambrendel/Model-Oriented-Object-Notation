"use strict";

/**
 * @file typeOf.js
 * @module moon/utilities/typeOf
 * @description
 * Determines the MOON type category for a JavaScript value.
 *
 * This function provides a normalized classification used by the schema
 * analyzer to distinguish between primitive values, structured objects,
 * arrays, and absent values.
 *
 * ## Classification rules
 *
 * | JavaScript value     | Returned type |
 * |----------------------|--------------|
 * | `null`               | `"null"`     |
 * | `undefined`          | `"null"`     |
 * | `[]`                 | `"array"`    |
 * | `{}`                 | `"object"`   |
 * | string / number / boolean | `"primitive"` |
 *
 * ## Design rationale
 *
 * - `null` and `undefined` are intentionally unified as `"null"`
 *   so array element type detection treats them as **absent values**
 *   rather than structured data.
 * - Arrays are detected before `"object"` because JavaScript arrays
 *   are technically objects.
 * - All non-object primitives (string, number, boolean, bigint, symbol)
 *   are classified as `"primitive"`.
 *
 * ## Stability contract
 *
 * This function defines the canonical type categories used throughout
 * the MOON schema analysis pipeline. Changes to its behavior will affect:
 *
 * - schema inference
 * - field frequency detection
 * - array element type resolution
 * - serialization decisions
 *
 * @function typeOf
 *
 * @param {*} value
 * Value to classify.
 *
 * @returns {"primitive"|"object"|"array"|"null"}
 * The normalized MOON type category.
 *
 * @example
 * typeOf(null);
 * // → "null"
 *
 * @example
 * typeOf([1, 2, 3]);
 * // → "array"
 *
 * @example
 * typeOf({ id: 1 });
 * // → "object"
 *
 * @example
 * typeOf("hello");
 * // → "primitive"
 */
const typeOf = value => (
  (value === null || value === undefined) && "null"
  || (typeof value === "object" && (
    Array.isArray(value) && "array" || "object")
  ) || "primitive"
);

/**
 * @ignore
 * Default export with freezing.
 */
module.exports = Object.freeze(Object.defineProperty(typeOf, "typeOf", {
  value: typeOf
}));