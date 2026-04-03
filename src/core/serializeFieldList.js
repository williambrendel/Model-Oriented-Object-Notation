"use strict";

/**
 * @file serializeFieldList.js
 * @module moon/core/serializeFieldList
 * @description
 * Serializes the inline field list for an object schema.
 *
 * Produces the pipe-delimited representation used inside `{...}`.
 * Handles variadic field omission and recursively serializes nested
 * object and array field descriptors.
 *
 * ## Output examples
 *
 * | Fields                        | Output
 * |------------------------------|-------------------------
 * | id, name, role              | `id|name|role`
 * | id, name, role*             | `id|name|...`
 * | nested object               | `lead{id|name}`
 * | array of primitives         | `members[3]`
 * | array of objects            | `items[]{id|title}`
 *
 * ## Rules
 *
 * - Non-variadic fields are serialized in order
 * - Variadic fields are omitted
 * - If any field is variadic, `...` is appended
 * - Nested descriptors are serialized recursively
 *
 * @function serializeFieldList
 *
 * @param {import("./Descriptor").Descriptor[]} fields
 *
 * @param {boolean} variadic
 * True if any field is variadic.
 *
 * @returns {string}
 * Pipe-delimited field list string.
 */

const serializeFieldList = (fields) => {
  const declared    = fields.filter(f => !f.variadic);
  const hasVariadic = fields.some(f => f.variadic);
  const parts       = declared.map(_serializeField);

  if (hasVariadic) parts.push("...");

  return parts.join("|");
};

/**
 * @private
 * @description
 * Renders a single field descriptor into its inline MOON schema representation.
 *
 * This function is recursive and is responsible for encoding nested object
 * and array field structures inside `{...}` field lists.
 *
 * ## Output examples
 *
 * | Descriptor type        | Output example       |
 * |------------------------|----------------------|
 * | primitive              | `name`               |
 * | object                 | `lead{id|name}`      |
 * | array (primitive)      | `members[3]`         |
 * | array (variable)       | `members[]`          |
 * | array (object)         | `items[]{id|title}`  |
 * | nested object + array  | `specs{perf[3]|wt}`  |
 *
 * ## Recursion behavior
 *
 * - Object fields delegate to `serializeFieldList`
 * - Array fields encode their dimension string
 * - Nested objects and arrays are rendered inline
 * - Mixed or unknown types fall back to primitive behavior
 *
 * @function _serializeField
 *
 * @param {import("./Descriptor").Descriptor} field
 * Field descriptor to render.
 *
 * @returns {string}
 * Inline schema fragment representing the field.
 *
 * @example
 * _serializeField({
 *   name: "lead",
 *   descriptor: {
 *     type: "object",
 *     fields: [
 *       { name: "id", descriptor: { type: "primitive" } },
 *       { name: "name", descriptor: { type: "primitive" } }
 *     ]
 *   }
 * });
 * // → "lead{id|name}"
 */
const _serializeField = field => {
  const { name } = field;

  if (field.type === "primitive")
    return name;

  if (field.type === "object") {
    const inner = serializeFieldList(field.fields);
    return `${name}{${inner}}`;
  }

  if (field.type === "array") {
    const dimStr = field.dims ?? field.dimensions.map(n => n === null ? "[]" : `[${n}]`).join("");

    if (field.elementType === "object") {
      const inner = serializeFieldList(field.fields);
      return `${name}${dimStr}{${inner}}`;
    }

    return `${name}${dimStr}`;
  }

  return name;
};

/**
 * @ignore
 * Default export with freezing.
 */
module.exports = Object.freeze(Object.defineProperty(serializeFieldList, "serializeFieldList", {
  value: serializeFieldList
}));