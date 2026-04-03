"use strict";

/**
 * @file applyReplacer.js
 * @module moon/utilities/applyReplacer
 * @description Recursively applies a replacer function to a value before
 * serialization, mirroring JSON.stringify replacer semantics exactly.
 *
 * - Called as `(key, value)` for every key in objects and every index in arrays.
 * - Return `undefined` to omit the key entirely.
 * - Return any other value to substitute it (recursed into).
 * - The root call uses key `""` and value = the root data.
 */

/**
 * Recursively applies a replacer function to a value.
 *
 * @param {string|number} key      - Current key (empty string for root call).
 * @param {*}             value    - Current value.
 * @param {Function}      replacer - `(key, value) => value | undefined`.
 * @returns {*} The transformed value, or `undefined` to omit.
 *
 * @example
 * // Remove sensitive fields
 * applyReplacer("", data, (key, val) => key === "password" ? undefined : val);
 *
 * @example
 * // Transform values
 * applyReplacer("", data, (key, val) => typeof val === "string" ? val.toUpperCase() : val);
 */
const applyReplacer = (key, value, replacer) => {
  const replaced = replacer(key, value);
  if (replaced === undefined) return undefined;

  if (Array.isArray(replaced)) {
    return replaced
      .map((item, i) => applyReplacer(i, item, replacer))
      .filter(v => v !== undefined);
  }

  if (replaced && typeof replaced === "object") {
    const out = {};
    for (const [k, v] of Object.entries(replaced)) {
      const result = applyReplacer(k, v, replacer);
      if (result !== undefined) out[k] = result;
    }
    return out;
  }

  return replaced;
};

module.exports = Object.freeze(Object.defineProperty(applyReplacer, "applyReplacer", {
  value: applyReplacer
}));
