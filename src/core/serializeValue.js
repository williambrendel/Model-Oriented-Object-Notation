"use strict";

const escape                    = require("../utilities/escape");
const { NULL_MARKER }           = require("../constants");

/**
 * @file serializeValue.js
 * @module moon/core/serializeValue
 * @description Converts a single JavaScript primitive value to its MOON token representation.
 *
 * MOON has exactly one reserved data-side token: `~` for null/absent.
 * All other values are emitted explicitly — no default tokens, no lookup tables.
 * An LLM reading the output sees the actual value every time.
 *
 * | JS value         | MOON token      | Notes                                          |
 * |------------------|-----------------|-------------------------------------------------|
 * | `null`           | `~`             | Absent — emitted for declared fields with no value |
 * | `undefined`      | `~`             | Treated as absent                               |
 * | `NaN`            | `~`             | Not a meaningful value — emitted as absent      |
 * | `Infinity`       | `~`             | Not representable — emitted as absent           |
 * | `-Infinity`      | `~`             | Not representable — emitted as absent           |
 * | `-0`             | `0`             | Normalised to zero                              |
 * | `true` / `false` | `true`/`false`  | Emitted as literals                             |
 * | number           | canonical form  | No exponent notation, no trailing zeros         |
 * | string           | escaped string  | Via {@link module:moon/utilities/escape}        |
 *
 * Objects and arrays are not handled here — they are the responsibility of
 * serializeRow.js and serialize.js respectively.
 *
 * @example
 * const serializeValue = require("./serializeValue");
 * serializeValue(null);           // → "~"
 * serializeValue(undefined);      // → "~"
 * serializeValue(NaN);            // → "~"
 * serializeValue(Infinity);       // → "~"
 * serializeValue(true);           // → "true"
 * serializeValue(false);          // → "false"
 * serializeValue(0);              // → "0"
 * serializeValue(-0);             // → "0"
 * serializeValue(42);             // → "42"
 * serializeValue(3.14);           // → "3.14"
 * serializeValue(1e21);           // → "1000000000000000000000"
 * serializeValue("Alice");        // → "Alice"
 * serializeValue("hello|world");  // → "hello\\|world"
 * serializeValue("~");            // → "\\~"  (literal tilde, not null token)
 */

/**
 * Expands a number string in exponent notation to plain decimal.
 * Pure string manipulation — no locale-dependent APIs.
 *
 * Strategy:
 *   1. Split on "e" — parseInt handles "+21", "-7", "21" correctly.
 *   2. Find where the decimal point sits in the absolute coefficient (dotIndex).
 *   3. Remove the decimal point to produce a flat digit string.
 *   4. Compute newDotPos = dotIndex + exponent (where the dot lands after shifting).
 *   5. newDotPos <= 0 → prepend "0." and leading zeros.
 *      newDotPos >= digits.length → append trailing zeros.
 *      otherwise → insert dot within the digit string.
 *   6. Strip trailing zeros from the fractional part, then a lone trailing dot.
 *
 * @param {string} s - Number string already confirmed to contain "e" or "E".
 * @returns {string}
 */
const expandExponent = s => {
  const [coef, exp] = s.toLowerCase().split("e");
  const exponent    = parseInt(exp, 10);          // handles "+21", "-7", "21"
  const negative    = coef.startsWith("-");
  const abs         = negative ? coef.slice(1) : coef;
  const dotIndex    = abs.includes(".") ? abs.indexOf(".") : abs.length;
  const digits      = abs.replace(".", "");       // flat digit string, dot removed
  const newDotPos   = dotIndex + exponent;        // where the dot lands after shifting

  let result;
  if (newDotPos <= 0) {
    // Dot moves left past all digits — prefix with "0." and leading zeros.
    // e.g. 1e-7 → "0." + "0000000" + "1" = "0.0000001"
    result = "0." + "0".repeat(-newDotPos) + digits;
  } else if (newDotPos >= digits.length) {
    // Dot moves right past all digits — suffix with trailing zeros.
    // e.g. 1e+21 → "1" + "0".repeat(21) = "1000000000000000000000"
    result = digits + "0".repeat(newDotPos - digits.length);
  } else {
    // Dot lands within the digit string — insert it.
    // e.g. 1.23e+1 → "123" → "12" + "." + "3" = "12.3"
    result = digits.slice(0, newDotPos) + "." + digits.slice(newDotPos);
  }

  // Strip trailing zeros after the decimal point, then a lone trailing dot.
  result = result.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");

  return negative ? "-" + result : result;
};

/**
 * Converts a JS number to MOON canonical form.
 *
 * Rules:
 * - `-0`            → `"0"`          (negative zero has no MOON representation)
 * - `NaN`           → `NULL_MARKER`  (not a number → emit as absent)
 * - `Infinity`      → `NULL_MARKER`  (not representable → emit as absent)
 * - exponent form   → plain decimal via expandExponent()
 * - otherwise       → String(n)      (JS already produces canonical decimal)
 *
 * @param {number} n
 * @returns {string}
 */
const serializeNumber = n => {
  if (Object.is(n, -0)) return "0";          // -0 normalised to 0
  if (!isFinite(n))      return NULL_MARKER; // NaN, Infinity, -Infinity → absent token

  const s = String(n);

  // String() is canonical for most numbers. Only exponent form needs expansion.
  if (!s.includes("e") && !s.includes("E")) return s;

  return expandExponent(s);
};

/**
 * Serializes a single JavaScript primitive value to its MOON token string.
 *
 * Throws on objects and arrays — those are handled by higher-level serializers
 * (serializeRow.js, serialize.js) that understand MOON structure.
 *
 * @function serializeValue
 * @param {null|undefined|boolean|number|string} value - The primitive value to serialize.
 * @returns {string} The MOON token string for this value.
 * @throws {TypeError} If value is an object, array, or symbol.
 *
 * @example
 * serializeValue(null);    // → "~"
 * serializeValue(0);       // → "0"
 * serializeValue(-0);      // → "0"
 * serializeValue(1e21);    // → "1000000000000000000000"
 * serializeValue("Alice"); // → "Alice"
 * serializeValue("a|b");   // → "a\\|b"
 * serializeValue("~");     // → "\\~"
 */
const serializeValue = value => {
  if (value === null || value === undefined) return NULL_MARKER;                // absent → reserved token
  if (typeof value === "boolean")            return value ? "true" : "false";  // booleans as literals
  if (typeof value === "number")             return serializeNumber(value);     // canonical number form
  if (typeof value === "string")             return escape(value);              // escape special chars
  throw new TypeError(`MOON serializeValue: unsupported value type "${typeof value}"`);
};

/**
 * @ignore
 * Default export with freezing.
 */
module.exports = Object.freeze(Object.defineProperty(serializeValue, "serializeValue", {
  value: serializeValue
}));