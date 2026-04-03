"use strict";

const serializeValue = require("./serializeValue");
const { ArrayDescriptor } = require("./Descriptor");
const { NULL_MARKER, FIELD_SEPARATOR } = require("../constants");

/**
 * @file serializeInlineValue.js
 * @module moon/core/serializeInlineValue
 * @description Encodes a JavaScript value as its inline MOON representation
 * for use within a columnar row — as a field value between `|` separators.
 *
 * This is distinct from the full block encoding produced by serializeArray.js.
 * serializeInlineValue is called per-field by serializeRow, and recursively by
 * itself for nested structures.
 *
 * ## Encoding rules by descriptor type
 *
 * | Descriptor            | Value             | Output                      |
 * |-----------------------|-------------------|-----------------------------|
 * | any                   | null / undefined  | `~`                         |
 * | primitive             | 42                | `42`                        |
 * | primitive             | "hello\|world"    | `hello\\\|world`            |
 * | object                | {id:1, name:"A"}  | `{1\|A}`                    |
 * | array[n] primitive    | [1, 2, 3]         | `[1\|2\|3]`                 |
 * | array[] primitive     | ["x", null, "z"]  | `[x\|~\|z]`                 |
 * | array[n] object       | [{id:1},{id:2}]   | `[{1}\|{2}]`                |
 * | array[r][c] primitive | [[1,2],[3,4]]     | `[[1\|2]\|[3\|4]]`          |
 * | object w/ array field | {perf:[...], w:.} | `{[95%\|98%]\|2.5kg}`       |
 *
 * Null / absent fields in objects emit `~`. Variadic fields are excluded —
 * they are emitted as `key=value` extras by serializeRow, not inline here.
 *
 * @example
 * serializeInlineValue(null, { type: "primitive" });
 * // → "~"
 *
 * @example
 * serializeInlineValue({ id: 1, name: "Alice" }, objectDescriptor);
 * // → "{1|Alice}"
 *
 * @example
 * serializeInlineValue(["core", "api"], arrayDescriptor);
 * // → "[core|api]"
 *
 * @example
 * // Object with array sub-field: specs{performance[3]|weight}
 * serializeInlineValue({ performance: ["95%","98%","97%"], weight: "2.5kg" }, specsDescriptor);
 * // → "{[95%|98%|97%]|2.5kg}"
 *
 * @example
 * // 2D grid field: grid[2][3]
 * serializeInlineValue([[1,2,3],[4,5,6]], gridDescriptor);
 * // → "[[1|2|3]|[4|5|6]]"
 */

/**
 * Encodes a single object record inline as `{v1|v2|v3}`.
 * Only declared (non-variadic) fields are included, in descriptor order.
 *
 * @param {Object|null|undefined}               obj    - The object to encode.
 * @param {import("./Descriptor").Descriptor[]} fields - Declared field descriptors.
 * @returns {string} e.g. `"{1|Alice}"` or `"{~|Bob}"`
 */
const serializeInlineObject = (obj, fields) => {
  let declared = fields.filter(f => !f.variadic);
  
  // Backup: if no declared fields but obj has values, 
  // treat all fields as declared (something went wrong with variadic detection)
  if (declared.length === 0 && obj && Object.keys(obj).length > 0) {
    declared = fields; // Use all fields as declared
    console.warn("No declared fields but object has values, falling back to treating all fields as declared");
  }

  const parts    = declared.map(f => serializeInlineValue(
    obj != null ? obj[f.name] : undefined,
    f
  ));
  return `{${parts.join(FIELD_SEPARATOR)}}`;
};

/**
 * Encodes a JavaScript value as its inline MOON representation.
 *
 * @function serializeInlineValue
 * @param {*}                                   value      - The value to encode.
 * @param {import("./Descriptor").Descriptor} descriptor - Schema descriptor for the value.
 * @returns {string} Inline MOON token string.
 *
 * @example
 * serializeInlineValue(42,      { type: "primitive" });              // → "42"
 * serializeInlineValue(null,    { type: "primitive" });              // → "~"
 * serializeInlineValue([1,2,3], arrayDescriptor);                   // → "[1|2|3]"
 * serializeInlineValue({id:1},  objectDescriptor);                  // → "{1}"
 */
const serializeInlineValue = (value, descriptor) => {
  // Null / absent — emits reserved token regardless of descriptor type.
  if (value === null || value === undefined) return NULL_MARKER;

  // ── Primitive ──────────────────────────────────────────────────────────────
  if (descriptor.type === "primitive") return serializeValue(value);

  // ── Object → {v1|v2|v3} ───────────────────────────────────────────────────
  if (descriptor.type === "object") {
    return serializeInlineObject(value, descriptor.fields);
  }

  // ── Array ─────────────────────────────────────────────────────────────────
  if (descriptor.type === "array") {
    const arr                          = Array.isArray(value) ? value : [];
    const { dimensions, elementType, fields } = descriptor;

    // ── 1D array ─────────────────────────────────────────────────────────────
    if (dimensions.length === 1) {
      if (elementType === "object") {
        // 1D object array: [{...},{...}] → [{v1|v2}|{v1|v2}] (objects in braces, wrapped)
        const parts = arr.map(elem => serializeInlineObject(elem, fields));
        return `[${parts.join(FIELD_SEPARATOR)}]`;
      }
      // 1D primitive (or mixed): [v1|v2|v3]
      return `[${arr.map(v => serializeValue(v)).join(FIELD_SEPARATOR)}]`;
    }

    // ── N>1 dimensions: recurse with inner descriptor, wrap in [...] ──────────
    const innerDescriptor = new ArrayDescriptor({
      dimensions:  dimensions.slice(1),
      elementType: descriptor.elementType,
      fields:      descriptor.fields,
      isOneLiner:  descriptor.isOneLiner,
    });
    const parts           = arr.map(elem => serializeInlineValue(elem, innerDescriptor));
    return `[${parts.join(FIELD_SEPARATOR)}]`;
  }

  // ── Mixed / fallback ───────────────────────────────────────────────────────
  return serializeValue(value);
};

/**
 * @ignore
 * Default export with freezing.
 */
module.exports = Object.freeze(Object.defineProperty(serializeInlineValue, "serializeInlineValue", {
  value: serializeInlineValue
}));