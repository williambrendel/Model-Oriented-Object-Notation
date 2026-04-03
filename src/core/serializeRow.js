"use strict";

const serializeInlineValue           = require("./serializeInlineValue");
const { ITEM_MARKER, FIELD_SEPARATOR } = require("../constants");

/**
 * @file serializeRow.js
 * @module moon/core/serializeRow
 * @description Encodes one object record as a MOON columnar row string.
 *
 * A row consists of:
 * 1. The item marker prefix (`-`), followed by a space.
 * 2. Positional field values — one per declared (non-variadic) schema field,
 *    separated by `|`, in descriptor field order.
 * 3. Variadic extras — `key=value` pairs for any variadic field that is
 *    present and non-null in this record, appended after the positional fields.
 *
 * The returned string has no leading indentation — the caller (serializeArray)
 * is responsible for prefixing the appropriate indent.
 *
 * ## Examples
 *
 * Flat record, all fields present:
 * ```
 * - 1|Alice|admin
 * ```
 *
 * Record with absent field (emits `~`):
 * ```
 * - 2|Bob|~
 * ```
 *
 * Record with nested array field:
 * ```
 * - Backend|[Alice|Bob|Carol]|[10|20]
 * ```
 *
 * Record with nested object field:
 * ```
 * - P1|API Gateway|{1|Alice}
 * ```
 *
 * Record with variadic extras:
 * ```
 * - 3|Carol|note=vip|tier=gold
 * ```
 *
 * Null record (all declared fields emit `~`):
 * ```
 * - ~|~|~
 * ```
 *
 * @example
 * const serializeRow = require("./serializeRow");
 *
 * serializeRow({ id: 1, name: "Alice", role: "admin" }, fields);
 * // → "- 1|Alice|admin"
 *
 * serializeRow({ id: 2, name: "Bob", role: null }, fields);
 * // → "- 2|Bob|~"
 *
 * serializeRow({ id: 3, name: "Carol", note: "vip" }, fields);
 * // → "- 3|Carol|note=vip"   (note is variadic)
 */

/**
 * Encodes one object record as a MOON columnar row string (no leading indent).
 *
 * @function serializeRow
 * @param {Object|null|undefined}                        record - The record to encode.
 *   A null or undefined record emits `~` for every declared field and no variadic extras.
 * @param {import("./Descriptor").Descriptor[]}  fields - All field descriptors
 *   for this array (both declared and variadic). Obtained from the array's schema descriptor.
 * @returns {string} Row string starting with `- `, e.g. `"- 1|Alice|admin"`.
 *
 * @example
 * serializeRow({ id: 1, name: "Alice" }, fields);
 * // → "- 1|Alice"
 *
 * @example
 * serializeRow(null, fields);
 * // → "- ~|~"
 */
const serializeRow = (record, fields) => {
  // ── Positional fields ──────────────────────────────────────────────────────
  // Declared (non-variadic) fields emitted in schema order.
  // Absent values (null, undefined, missing key) produce ~.
  const positional = fields
    .filter(f => !f.variadic)
    .map(f => serializeInlineValue(
      record != null ? record[f.name] : undefined,
      f
    ));

  // ── Variadic extras ────────────────────────────────────────────────────────
  // Variadic fields emitted as key=value only when present and non-null.
  const extras = fields
    .filter(f => f.variadic && record != null && record[f.name] != null)
    .map(f => `${f.name}=${serializeInlineValue(record[f.name], f)}`);

  return `${ITEM_MARKER} ${[...positional, ...extras].join(FIELD_SEPARATOR)}`;
};

/**
 * @ignore
 * Default export with freezing.
 */
module.exports = Object.freeze(Object.defineProperty(serializeRow, "serializeRow", {
  value: serializeRow
}));