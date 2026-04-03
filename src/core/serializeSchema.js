"use strict";

const serializeFieldList = require("./serializeFieldList");

/**
 * Produces the MOON schema declaration string for an array field.
 *
 * @function serializeSchema
 * @param {string}                              name       - Field name.
 * @param {import("./Descriptor").Descriptor} descriptor - Array descriptor from analyzeSchema.
 * @param {SerializeSchemaOptions}              [options]
 * @returns {string} Schema declaration string including trailing colon.
 * @throws {TypeError} If descriptor.type is not "array".
 *
 * @example
 * serializeSchema("tags", { type:"array", dimensions:[3], elementType:"primitive", ... });
 * // → "tags[3]:"
 *
 * @example
 * serializeSchema("users", {
 *   type:"array", dimensions:[3], elementType:"object", variadic:false,
 *   fields:[
 *     { name:"id",   frequency:1, descriptor:{ type:"primitive" } },
 *     { name:"name", frequency:1, descriptor:{ type:"primitive" } },
 *     { name:"role", frequency:1, descriptor:{ type:"primitive" } },
 *   ]
 * });
 * // → "users[3]{id|name|role}:"
 */
const serializeSchema = (name, descriptor) => {
  if (descriptor.type !== "array") {
    throw new TypeError(
      `serializeSchema: expected array descriptor, got "${descriptor.type}"`
    );
  }

  const dimStr = descriptor.dims ?? descriptor.dimensions.map(n => n === null ? "[]" : `[${n}]`).join("");

  if (descriptor.elementType === "object") {
    const fieldList = serializeFieldList(descriptor.fields);
    return `${name}${dimStr}{${fieldList}}:`;
  }

  return `${name}${dimStr}:`;
};

/**
 * @ignore
 * Default export with freezing.
 */
module.exports = Object.freeze(Object.defineProperty(serializeSchema, "serializeSchema", {
  value: serializeSchema
}));