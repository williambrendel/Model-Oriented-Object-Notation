"use strict";

const resolveFixedLength = require("../utilities/resolveFixedLength");
const typeOf             = require("../utilities/typeOf");
const isVariadic         = require("../utilities/isVariadic");
const { VARIADIC_MAX_FREQUENCY } = require("../constants");
const { PrimitiveDescriptor, ObjectDescriptor, ArrayDescriptor } = require("./Descriptor");

/**
 * @file analyzeSchema.js
 * @module moon/core/analyzeSchema
 * @description Recursively analyses a JavaScript value and produces a MOON schema descriptor.
 *
 * The descriptor captures the full nested structure of the data — objects, arrays,
 * multi-dimensional grids, and grids of objects — at every depth. It is consumed by
 * serializeSchema.js (schema declaration emission) and serializeRow.js (data line emission).
 *
 * ## Core insight
 *
 * Objects are self-describing — keys carry meaning directly, no schema needed.
 * Arrays lose their keys in positional encoding — a schema is required.
 * MOON emits schemas only for arrays, inline at the field site.
 *
 * ## Descriptor shapes
 *
 * Primitive:
 * ```js
 * { type: "primitive" }
 * ```
 *
 * Object:
 * ```js
 * { type: "object", variadic: false, fields: [ FieldDescriptor, ... ] }
 * ```
 *
 * Array:
 * ```js
 * {
 *   type:        "array",
 *   dimensions:  [3, 4],                      // one entry per nesting level; null = variable
 *   elementType: "primitive"|"object"|"mixed",
 *   fields:      [ FieldDescriptor, ... ],    // only when elementType === "object"
 *   variadic:    false,                       // only when elementType === "object"
 *   isOneLiner:  true                         // only when elementType === "primitive"
 * }
 * ```
 *
 * `dimensions` encodes all nesting levels:
 * - `[3]`     → flat 1D array of 3 elements
 * - `[3, 4]`  → 2D grid: 3 rows × 4 columns
 * - `[2,3,4]` → 3D grid: 2 × 3 × 4
 * - `[null]`  → variable-length (length not consistent across parent records)
 *
 * ## Variadic fields
 *
 * A field is variadic when its non-null presence frequency falls below
 * `variadicMaxFrequency`. Variadic fields are omitted from the schema and emitted
 * as `key=value` only when present. There is no optional tier — a declared field
 * always appears in every row, either with a value or `~`.
 *
 * ## isOneLiner
 *
 * A primitive array is a one-liner when no element is a string containing `|`.
 * The serializer collapses one-liner arrays to `field[n]: a|b|c` instead of a block.
 *
 * @example
 * analyzeSchema([
 *   { id: 1, name: "Alice", scores: [95, 87, 92] },
 *   { id: 2, name: "Bob",   scores: [85, 90, 88] }
 * ]);
 * // {
 * //   type: "array", dimensions: [2], elementType: "object", variadic: false, fields: [
 * //     { name: "id",     frequency: 1, descriptor: { type: "primitive" } },
 * //     { name: "name",   frequency: 1, descriptor: { type: "primitive" } },
 * //     { name: "scores", frequency: 1, descriptor: {
 * //       type: "array", dimensions: [3], elementType: "primitive",
 * //       isOneLiner: true, variadic: false, fields: []
 * //     }}
 * //   ]
 * // }
 *
 * @example
 * // 3D grid
 * analyzeSchema([[[1,2,3,4],[5,6,7,8]],[[9,10,11,12],[13,14,15,16]]]);
 * // { type: "array", dimensions: [2, 2, 4], elementType: "primitive", isOneLiner: true, ... }
 *
 * @example
 * // Grid of objects: quantum_states[3][2]{amplitude|phase|probability}
 * analyzeSchema([[{amplitude:0.5,phase:0.2,probability:0.25},{amplitude:0.3,...}], ...]);
 * // { type: "array", dimensions: [3, 2], elementType: "object", fields: [...] }
 */

/**
 * @typedef {Object} FieldDescriptor
 * @property {string}     name       - Field name.
 * @property {number}     frequency  - Non-null presence frequency 0..1.
 * @property {boolean}    variadic   - True if frequency < variadicMaxFrequency.
 *                                     Variadic fields are omitted from the schema
 *                                     and emitted as `key=value` only when present.
 * @property {Descriptor} descriptor - Recursive descriptor for this field's values.
 */

/**
 * @typedef {Object} Descriptor
 * @property {"primitive"|"object"|"array"} type
 * @property {boolean}                        [variadic]     - Object/array-of-objects: any field is variadic.
 * @property {FieldDescriptor[]}              [fields]       - Object or array-of-objects: field descriptors.
 * @property {(number|null)[]}                [dimensions]   - Array: one entry per nesting level. null = variable.
 * @property {"primitive"|"object"|"mixed"}   [elementType]  - Array: leaf element type.
 * @property {boolean}                        [isOneLiner]   - Primitive array: no element contains `|`.
 */

/**
 * Analyses an array of object records and produces field descriptors.
 *
 * null, undefined, and missing key are all treated as absent. Frequency is
 * the fraction of records with a non-null/undefined value for a given key.
 * Fields at or above `variadicMaxFrequency` are declared in the schema.
 * Fields below the threshold are variadic.
 *
 * @param {Object[]} records - Non-null object records.
 * @param {number}   total   - Total parent record count (including absent records).
 * @param {Required<AnalyzeOptions>} opts
 * @returns {{ fields: FieldDescriptor[], variadic: boolean }}
 */
const analyzeFields = (records, total, opts) => {
  const { variadicMaxFrequency } = opts;

  const freq   = Object.create(null); // key → count of non-null occurrences
  const values = Object.create(null); // key → all non-null observed values

  for (const record of records) {
    if (!record || typeof record !== "object" || Array.isArray(record)) continue;
    for (const key of Object.keys(record)) {
      if (record[key] !== null && record[key] !== undefined) {
        freq[key]   = (freq[key] || 0) + 1;
        values[key] = values[key] || [];
        values[key].push(record[key]);
      }
    }
  }

  let variadic = false;
  const fields = [];

  for (const key of Object.keys(freq)) {
    const f           = freq[key] / total;
    const fieldValues = values[key] || [];

    if (isVariadic(key, f, variadicMaxFrequency)) variadic = true;

    const allObjects = fieldValues.length > 0 &&
      fieldValues.every(v => v && typeof v === "object" && !Array.isArray(v));
    const allArrays  = fieldValues.length > 0 && fieldValues.every(Array.isArray);

    let descriptor;

    if (allObjects) {
      const nested = analyzeFields(fieldValues, fieldValues.length, opts);
      descriptor   = new ObjectDescriptor({ fields: nested.fields });

    } else if (allArrays) {
      const fixedLength = total === 1
        ? fieldValues[0].length
        : resolveFixedLength(fieldValues);
      // eslint-disable-next-line no-use-before-define
      descriptor = _analyzeArray(fieldValues.flat(1), fixedLength, opts);

    } else {
      descriptor = new PrimitiveDescriptor();
    }

    const fieldVariadic = isVariadic(key, f, variadicMaxFrequency);
    fields.push(
      descriptor instanceof ArrayDescriptor
        ? new ArrayDescriptor({ dimensions: descriptor.dimensions, elementType: descriptor.elementType, fields: descriptor.fields, isOneLiner: descriptor.isOneLiner, name: key, frequency: f, variadic: fieldVariadic })
        : descriptor instanceof ObjectDescriptor
          ? new ObjectDescriptor({ fields: descriptor.fields, name: key, frequency: f, variadic: fieldVariadic })
          : new PrimitiveDescriptor({ name: key, frequency: f, variadic: fieldVariadic })
    );
  }

  return { fields, variadic };
};

/**
 * Internal recursive array analyser.
 *
 * Handles primitive arrays, object arrays, and multi-dimensional grids.
 * Grid dimensions are accumulated in `descriptor.dimensions` — each recursive
 * call for an array-of-arrays prepends its own fixed length to the inner
 * descriptor's dimension list, building up the full dimension signature.
 *
 * @example
 * // sensor_grid[2][3][4]: called with outer 2×3 of 4-element rows
 * // First call:  arr = [row0..row5 as arrays], fixedLength = 3 → allArrays → recurse
 * // Second call: arr = [1,2,3,4,...,24],        fixedLength = 4 → allPrimitive → base
 * // Dimensions accumulate as [4] → [3,4] → [2,3,4]
 *
 * @param {any[]}       arr         - Elements to analyse (may be from a flattened outer level).
 * @param {number|null} fixedLength - Outer fixed length (null = variable).
 * @param {Required<AnalyzeOptions>} opts
 * @returns {Descriptor}
 */
const _analyzeArray = (arr, fixedLength, opts) => {
  if (!Array.isArray(arr) || arr.length === 0) {
    return new ArrayDescriptor({ dimensions: [fixedLength ?? 0], elementType: "primitive", isOneLiner: true, fields: [] });
  }

  const nonNull     = arr.filter(v => v !== null && v !== undefined);
  const uniqueTypes = new Set(nonNull.map(typeOf));

  const allPrimitive = nonNull.length === 0 || [...uniqueTypes].every(t => t === "primitive");
  const allObjects   = nonNull.length > 0   && [...uniqueTypes].every(t => t === "object");
  const allArrays    = nonNull.length > 0   && [...uniqueTypes].every(t => t === "array");

  // ── Primitive array ──────────────────────────────────────────────────────
  if (allPrimitive) {
    const isOneLiner = !nonNull.some(v => typeof v === "string" && v.includes("|"));
    return new ArrayDescriptor({ dimensions: [fixedLength], elementType: "primitive", isOneLiner, fields: [] });
  }

  // ── Object array ─────────────────────────────────────────────────────────
  if (allObjects) {
    const { fields, variadic } = analyzeFields(nonNull, arr.length, opts);
    return new ArrayDescriptor({ dimensions: [fixedLength], elementType: "object", isOneLiner: false, fields });
  }

  // ── Array of arrays (grid) ───────────────────────────────────────────────
  if (allArrays) {
    const innerFixed = resolveFixedLength(nonNull);
    const inner      = _analyzeArray(nonNull.flat(1), innerFixed, opts);
    return new ArrayDescriptor({ dimensions: [fixedLength, ...inner.dimensions], elementType: inner.elementType, isOneLiner: inner.isOneLiner, fields: inner.fields });
  }

  // ── Mixed ────────────────────────────────────────────────────────────────
  return new ArrayDescriptor({ dimensions: [fixedLength], elementType: "mixed", isOneLiner: false, fields: [] });
};

/**
 * Recursively analyses a JavaScript value and returns a MOON schema descriptor.
 *
 * Entry point for the schema inference pipeline. Dispatches to the appropriate
 * internal analyser based on the value's type.
 *
 * @function analyzeSchema
 * @param {*}              value     - Any JS value: primitive, object, or array.
 * @param {AnalyzeOptions} [options]
 * @returns {Descriptor}
 *
 * @example
 * analyzeSchema({ name: "Acme", tags: ["tech", "startup"] });
 * // { type: "object", variadic: false, fields: [
 * //   { name: "name", frequency: 1, descriptor: { type: "primitive" } },
 * //   { name: "tags", frequency: 1, descriptor: {
 * //     type: "array", dimensions: [2], elementType: "primitive",
 * //     isOneLiner: true, variadic: false, fields: []
 * //   }}
 * // ]}
 *
 * @example
 * // 3D grid
 * analyzeSchema([[[1,2],[3,4]],[[5,6],[7,8]]]);
 * // { type: "array", dimensions: [2, 2, 2], elementType: "primitive",
 * //   isOneLiner: true, variadic: false, fields: [] }
 *
 * @example
 * // Grid of objects: quantum_states[3][2]{amplitude|phase|probability}
 * analyzeSchema([
 *   [{amplitude:0.5,phase:0.2,probability:0.25},{amplitude:0.3,phase:0.8,probability:0.15}],
 *   [{amplitude:0.7,phase:0.1,probability:0.35},{amplitude:0.2,phase:0.5,probability:0.20}]
 * ]);
 * // { type: "array", dimensions: [2, 2], elementType: "object", variadic: false,
 * //   fields: [
 * //     { name: "amplitude",   frequency: 1, descriptor: { type: "primitive" } },
 * //     { name: "phase",       frequency: 1, descriptor: { type: "primitive" } },
 * //     { name: "probability", frequency: 1, descriptor: { type: "primitive" } }
 * //   ]}
 */
const analyzeSchema = (value, options = {}) => {
  const opts = { variadicMaxFrequency: VARIADIC_MAX_FREQUENCY, ...options };
  const t    = typeOf(value);

  if (t === "primitive" || t === "null") return new PrimitiveDescriptor();

  if (t === "object") {
    const { fields } = analyzeFields([value], 1, opts);
    return new ObjectDescriptor({ fields });
  }

  // Top-level array: outer length is always known at encode time.
  return _analyzeArray(value, value.length, opts);
};

/**
 * @ignore
 * Default export with freezing.
 */
module.exports = Object.freeze(Object.defineProperty(analyzeSchema, "analyzeSchema", {
  value: analyzeSchema
}));