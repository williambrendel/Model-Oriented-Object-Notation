"use strict";

const serializeValue       = require("./serializeValue");
const serializeSchema      = require("./serializeSchema");
const serializeFieldList   = require("./serializeFieldList");
const serializeRow         = require("./serializeRow");
const serializeInlineValue = require("./serializeInlineValue");
const analyzeSchema        = require("./analyzeSchema");
const isPureObject         = require("../utilities/isPureObject");
const { ArrayDescriptor, ObjectDescriptor } = require("./Descriptor");
const {
  NULL_MARKER, FIELD_SEPARATOR, ITEM_MARKER, INDENT,
  COMPRESSION_HIGH, COMPRESSION_MEDIUM, DEFAULT_COMPRESSION,
} = require("../constants");

/**
 * @file serializeObject.js
 * @module moon/core/serializeObject
 * @description Encodes a JavaScript array or object as a MOON block.
 *
 * Both `serializeArray` and `serializeObject` live in this module to eliminate
 * the circular dependency that arises when each file requires the other.
 * `serializeArray` is exported as a named property on the `serializeObject` export:
 *
 * @example
 * const serializeObject = require("./serializeObject");
 * const serializeArray  = serializeObject.serializeArray;
 */

// ── Private helpers ───────────────────────────────────────────────────────────

const sliceDescriptor = descriptor => new ArrayDescriptor({
  dimensions:  descriptor.dimensions.slice(1),
  elementType: descriptor.elementType,
  fields:      descriptor.fields,
  isOneLiner:  descriptor.isOneLiner,
});

const serializeGridRow = (rowValue, inner) => {
  const arr = Array.isArray(rowValue) ? rowValue : [];
  if (!inner.isGrid) {
    if (inner.elementType === "primitive") {
      return arr.map(v => serializeValue(v)).join(FIELD_SEPARATOR);
    }
    if (inner.elementType === "object") {
      const objDesc = new ObjectDescriptor({ fields: inner.fields });
      return arr.map(elem => serializeInlineValue(elem, objDesc)).join(FIELD_SEPARATOR);
    }
  }
  const deeper = sliceDescriptor(inner);
  return arr.map(elem => serializeInlineValue(elem, deeper)).join(FIELD_SEPARATOR);
};

// ── serializeArray ────────────────────────────────────────────────────────────

/**
 * Encodes a JavaScript array as a MOON array block.
 *
 * @function serializeArray
 * @param {string}          name        - Field name for the schema line.
 * @param {any[]|null}      value       - The array to encode.
 * @param {ArrayDescriptor} descriptor  - Array descriptor from analyzeSchema.
 * @param {number}          depth       - Indent level for the schema line.
 * @param {Object}          [context]   - Mutable context object for feature flag tracking.
 * @param {Object}          [opts]      - Serialization options.
 * @param {boolean}         [opts.addHints=false]       - Append field name hint to first row.
 * @param {string}          [opts.hintPrefix="#"]       - Prefix character for hint comments.
 * @param {string}          [opts.compression="high"]   - Compression level: high|medium|low.
 * @returns {string} Multi-line string, no trailing newline.
 *
 * @example
 * serializeArray("tags", ["core","revenue","critical"], descriptor, 0);
 * // → "tags[3]: core|revenue|critical"
 */
const serializeArray = (name, value, descriptor, depth, context, opts = {}) => {
  const indent      = INDENT.repeat(depth);
  const arr         = Array.isArray(value) ? value : [];
  const lines       = [];
  const addHints    = opts.addHints    ?? false;
  const hintPrefix  = opts.hintPrefix  ?? "#";
  const compression = opts.compression ?? DEFAULT_COMPRESSION;

  // ── Grid (high) — compact rows ─────────────────────────────────────────────
  if (descriptor.isGrid && compression === COMPRESSION_HIGH) {
    if (context) {
      context.hasGrid = true;
      context.hasSep  = true;
      context.hasItem = true;
      if (descriptor.elementType === "object") context.hasInline = true;
    }
    lines.push(`${indent}${serializeSchema(name, descriptor)}`);
    const inner = sliceDescriptor(descriptor);
    for (const row of arr) {
      lines.push(`${indent}${ITEM_MARKER} ${serializeGridRow(row, inner)}`);
    }
    return lines.join("\n");
  }

  // ── Grid (medium/low) — full schema declaration, nested rows like TOON ──────
  if (descriptor.isGrid) {
    if (context) context.hasItem = true;
    lines.push(`${indent}${serializeSchema(name, descriptor)}`);
    const innerDesc = sliceDescriptor(descriptor);
    for (const row of arr) {
      const innerStr   = serializeArray("", row, innerDesc, depth + 2, context, opts);
      const innerLines = innerStr.split("\n");
      lines.push(`${indent}${ITEM_MARKER} ${innerLines[0].slice(depth + 2)}`);
      for (let i = 1; i < innerLines.length; i++) lines.push(innerLines[i]);
    }
    return lines.join("\n");
  }

  // ── 1D primitive ───────────────────────────────────────────────────────────
  if (descriptor.elementType === "primitive") {
    if (descriptor.isOneLiner) {
      if (context) context.hasSep = true;
      const values = arr.map(v => serializeValue(v)).join(FIELD_SEPARATOR);
      return `${indent}${serializeSchema(name, descriptor)}${values ? " " + values : ""}`;
    }
    if (context) context.hasItem = true;
    lines.push(`${indent}${serializeSchema(name, descriptor)}`);
    for (const elem of arr) {
      lines.push(`${indent}${ITEM_MARKER} ${serializeValue(elem)}`);
    }
    return lines.join("\n");
  }

  // ── 1D mixed — dispatch each element by its actual type ───────────────────
  if (descriptor.elementType === "mixed") {
    if (context) context.hasItem = true;
    lines.push(`${indent}${serializeSchema(name, descriptor)}`);
    for (const elem of arr) {
      if (elem === null || elem === undefined) {
        lines.push(`${indent}${ITEM_MARKER} ${serializeValue(null)}`);
      } else if (typeof elem === "object" && !Array.isArray(elem)) {
        if (isPureObject(elem) && compression === COMPRESSION_HIGH) {
          if (context && Object.keys(elem).length > 1) context.hasSep = true;
          const pairs = Object.entries(elem)
            .map(([k, v]) => `${k}=${serializeValue(v)}`)
            .join(FIELD_SEPARATOR);
          lines.push(`${indent}${ITEM_MARKER} ${pairs}`);
        } else {
          const objStr   = serializeObject(elem, depth + 2, context, opts);
          const objLines = objStr ? objStr.split("\n") : [];
          if (objLines.length === 0) {
            lines.push(`${indent}${ITEM_MARKER}`);
          } else {
            lines.push(`${indent}${ITEM_MARKER} ${objLines[0].slice(depth + 2)}`);
            for (let i = 1; i < objLines.length; i++) lines.push(objLines[i]);
          }
        }
      } else if (Array.isArray(elem)) {
        const innerDesc  = analyzeSchema(elem);
        const innerStr   = serializeArray("", elem, innerDesc, depth + 1, context, opts);
        const innerLines = innerStr.split("\n");
        lines.push(`${indent}${ITEM_MARKER} ${innerLines[0].trimStart()}`);
        for (let i = 1; i < innerLines.length; i++) lines.push(innerLines[i]);
      } else {
        lines.push(`${indent}${ITEM_MARKER} ${serializeValue(elem)}`);
      }
    }
    return lines.join("\n");
  }

  // ── 1D object ──────────────────────────────────────────────────────────────
  const hasNestedFields = descriptor.isColumnar && descriptor.fields.some(
    f => !f.variadic && (f.type === "object" || f.type === "array")
  );
  const allowColumnar =
    descriptor.isColumnar &&
    compression !== "low" &&
    !(compression === COMPRESSION_MEDIUM && hasNestedFields);

  if (allowColumnar) {
    if (context) {
      context.hasSep   = true;
      context.hasItem  = true;
      if (hasNestedFields) {
        context.hasNested = true;
        context.hasInline = true;
      } else {
        context.hasSchema = true;
      }
      if (descriptor.fields.some(f => f.variadic)) context.hasVariadic = true;
    }
    lines.push(`${indent}${serializeSchema(name, descriptor)}`);
    const hint = addHints && arr.length > 0
      ? `  ${hintPrefix} ${serializeFieldList(descriptor.fields)}`
      : "";
    if (context) context.hasHints = hint.length > 0;
    for (let i = 0; i < arr.length; i++) {
      const row = `${indent}${serializeRow(arr[i], descriptor.fields)}`;
      lines.push(i === 0 && hint ? `${row}${hint}` : row);
    }
    return lines.join("\n");
  }

  // ── Block complex ──────────────────────────────────────────────────────────
  if (context) context.hasItem = true;
  lines.push(`${indent}${name}${descriptor.dims}:`);
  for (const record of arr) {
    const objStr = serializeObject(record, depth + 2, context, opts);
    if (!objStr) continue;
    const objLines  = objStr.split("\n");
    const firstLine = objLines[0].slice(depth + 2);
    lines.push(`${indent}${ITEM_MARKER} ${firstLine}`);
    for (let i = 1; i < objLines.length; i++) lines.push(objLines[i]);
  }
  return lines.join("\n");
};

// ── serializeObject ───────────────────────────────────────────────────────────

/**
 * Encodes a plain JavaScript object as MOON object lines.
 *
 * @function serializeObject
 * @param {Object|null|undefined} value   - The object to encode.
 * @param {number}                depth   - Indent level for all emitted lines.
 * @param {Object}                [context] - Mutable context object.
 * @param {Object}                [opts]    - Serialization options.
 * @returns {string} MOON-encoded lines joined by `\n`. Empty string if nothing to emit.
 *
 * @example
 * serializeObject({ id: 1, name: "Alice" }, 0);
 * // → "id=1\nname=Alice"
 *
 * @example
 * serializeObject({ budget: { amount: 500000, currency: "USD" } }, 0);
 * // → "budget: amount=500000|currency=USD"
 *
 * @example
 * serializeObject({ tags: ["core", "api"] }, 0);
 * // → "tags[2]: core|api"
 */
const serializeObject = (value, depth, context, opts = {}) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";

  const indent = INDENT.repeat(depth);
  const lines  = [];

  for (const [key, val] of Object.entries(value)) {

    // ── null / undefined ────────────────────────────────────────────────────
    if (val === null || val === undefined) {
      if (context) context.hasNull = true;
      lines.push(`${indent}${key}=${NULL_MARKER}`);
      continue;
    }

    // ── array ───────────────────────────────────────────────────────────────
    if (Array.isArray(val)) {
      const descriptor = analyzeSchema(val);
      lines.push(serializeArray(key, val, descriptor, depth, context, opts));
      continue;
    }

    // ── nested object ───────────────────────────────────────────────────────
    if (typeof val === "object") {
      if (Object.keys(val).length === 0) {
        lines.push(`${indent}${key}:`);
        continue;
      }
      if (isPureObject(val) && opts.compression !== "low" && opts.compression !== "medium") {
        if (context && Object.keys(val).length > 1) context.hasSep = true;
        const pairs = Object.entries(val)
          .map(([k, v]) => `${k}=${serializeValue(v)}`)
          .join(FIELD_SEPARATOR);
        lines.push(`${indent}${key}: ${pairs}`);
      } else {
        lines.push(`${indent}${key}:`);
        const nested = serializeObject(val, depth + 1, context, opts);
        if (nested) lines.push(nested);
      }
      continue;
    }

    // ── primitive ───────────────────────────────────────────────────────────
    lines.push(`${indent}${key}=${serializeValue(val)}`);
  }

  return lines.join("\n");
};

// ── Exports ───────────────────────────────────────────────────────────────────

serializeObject.serializeArray = serializeArray;
module.exports = Object.freeze(Object.defineProperty(serializeObject, "serializeObject", {
  value: serializeObject
}));