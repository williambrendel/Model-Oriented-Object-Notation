"use strict";

const {
  NULL_MARKER,
  FIELD_SEPARATOR,
  ITEM_MARKER,
  DIRECTIVE_PREFIX,
  DIRECTIVE_NULL,
  DIRECTIVE_SEP,
  DIRECTIVE_ITEM,
  DIRECTIVE_HINT,
  DIRECTIVE_EX_SCHEMA,
  DIRECTIVE_EX_NESTED,
  DIRECTIVE_EX_GRID,
  DIRECTIVE_EX_INLINE,
  DIRECTIVE_EX_VARIADIC,
  EX_SCHEMA,
  EX_NESTED,
  EX_GRID,
  EX_INLINE,
  EX_VARIADIC,
} = require("../constants");

/**
 * @file serializeDirectives.js
 * @module moon/core/serializeDirectives
 * @description Emits the MOON document header directives.
 *
 * Two kinds of directives are emitted, both conditional:
 *
 * **Token directives** — emitted only when the corresponding pattern appears
 * in the document body. A flat object with no arrays or nulls emits nothing.
 *
 * | Directive | Emitted when              |
 * |-----------|---------------------------|
 * | `@null`   | `context.hasNull`         |
 * | `@sep`    | `context.hasSep`          |
 * | `@item`   | `context.hasItem`         |
 * | `@hint`   | `options.hintPrefix` set  |
 *
 * **Example directives** — inline decoding hints for model comprehension.
 * Each is emitted only when the corresponding flag in `context` is true.
 *
 * | Directive       | Emitted when              |
 * |-----------------|---------------------------|
 * | `@ex_schema`    | `context.hasSchema`       |
 * | `@ex_nested`    | `context.hasNested`       |
 * | `@ex_grid`      | `context.hasGrid`         |
 * | `@ex_inline`    | `context.hasInline`       |
 * | `@ex_variadic`  | `context.hasVariadic`     |
 *
 * @example
 * // Flat object — no directives
 * serializeDirectives({}, {});
 * // ""
 *
 * @example
 * // One-liner array — only @sep
 * serializeDirectives({}, { hasSep: true });
 * // "@sep:|"
 *
 * @example
 * serializeDirectives({}, { hasNull: true, hasSep: true, hasItem: true, hasSchema: true });
 * // "@null:~\n@sep:|\n@item:-\n@ex_schema: u[3]{id|name}: - 1|Alice"
 */

/**
 * @typedef {Object} DirectiveOptions
 * @property {string}  [nullMarker]            - Override for the null token.
 * @property {string}  [fieldSeparator]        - Override for the field separator.
 * @property {string}  [itemMarker]            - Override for the item row prefix.
 * @property {string}  [hintPrefix]            - Comment prefix character. Omitted if not set.
 * @property {boolean} [addDefinitions=true]   - Emit token directives.
 * @property {boolean} [addSchemaExamples=true] - Emit @ex_* example directives.
 */

/**
 * @typedef {Object} DirectiveContext
 * @property {boolean} [hasNull]     - Document contains a null value (`~`).
 * @property {boolean} [hasSep]      - Document uses the field separator.
 * @property {boolean} [hasItem]     - Document uses the item row prefix.
 * @property {boolean} [hasSchema]   - Document contains a flat columnar array.
 * @property {boolean} [hasNested]   - Document contains a columnar array with nested fields.
 * @property {boolean} [hasGrid]     - Document contains a grid.
 * @property {boolean} [hasInline]   - Document contains inline [v] or {v} values in rows.
 * @property {boolean} [hasVariadic] - Document contains an array with variadic fields.
 */

/**
 * Emits MOON document-level directives as a newline-joined string.
 * Returns an empty string when nothing needs to be emitted.
 *
 * @function serializeDirectives
 * @param {DirectiveOptions}  [options={}]
 * @param {DirectiveContext}  [context={}]
 * @returns {string} Directive lines joined by `\n`. Empty string if nothing to emit.
 *
 * @example
 * serializeDirectives({}, { hasSep: true, hasItem: true });
 * // "@sep:|\n@item:-"
 */
const serializeDirectives = (options = {}, context = {}) => {
  const {
    nullMarker        = NULL_MARKER,
    fieldSeparator    = FIELD_SEPARATOR,
    itemMarker        = ITEM_MARKER,
    hintPrefix        = null,
    addDefinitions    = true,
    addSchemaExamples = true,
  } = options;

  const lines = [];

  // ── Token directives (conditional) ────────────────────────────────────────
  if (addDefinitions) {
    if (context.hasNull) lines.push(`${DIRECTIVE_PREFIX}${DIRECTIVE_NULL}: ${nullMarker}`);
    if (context.hasSep)  lines.push(`${DIRECTIVE_PREFIX}${DIRECTIVE_SEP}: ${fieldSeparator}`);
    if (context.hasItem) lines.push(`${DIRECTIVE_PREFIX}${DIRECTIVE_ITEM}: ${itemMarker}`);
    if (hintPrefix)      lines.push(`${DIRECTIVE_PREFIX}${DIRECTIVE_HINT}: ${hintPrefix}`);
  }

  // ── Example directives (conditional) ──────────────────────────────────────
  if (addSchemaExamples) {
    if (context.hasSchema)   lines.push(`${DIRECTIVE_PREFIX}${DIRECTIVE_EX_SCHEMA}: ${EX_SCHEMA}`);
    if (context.hasNested)   lines.push(`${DIRECTIVE_PREFIX}${DIRECTIVE_EX_NESTED}: ${EX_NESTED}`);
    if (context.hasGrid)     lines.push(`${DIRECTIVE_PREFIX}${DIRECTIVE_EX_GRID}: ${EX_GRID}`);
    if (context.hasInline)   lines.push(`${DIRECTIVE_PREFIX}${DIRECTIVE_EX_INLINE}: ${EX_INLINE}`);
    if (context.hasVariadic) lines.push(`${DIRECTIVE_PREFIX}${DIRECTIVE_EX_VARIADIC}: ${EX_VARIADIC}`);
  }

  return lines.join("\n");
};

/**
 * @ignore
 * Default export with freezing.
 */
module.exports = Object.freeze(Object.defineProperty(serializeDirectives, "serializeDirectives", {
  value: serializeDirectives
}));