"use strict";

/**
 * @file constants.js
 * @module moon/constants
 * @description Shared constants used across the MOON encoder and decoder.
 *
 * All tokens are single-character or short strings chosen for minimal token
 * cost and low collision frequency with real-world data values.
 *
 * Runtime overrides are expressed via `@`-directives in the document header
 * (e.g. `@null:~`, `@sep:|`, `@item:-`). These constants define the defaults
 * and are the single source of truth for all configurable tokens.
 */

/**
 * Null / absent value marker.
 * Emitted in a data row when a declared schema field has no value.
 * A literal `~` string in source data MUST be escaped as `\~`.
 * @type {string}
 */
const NULL_MARKER = "~";

/**
 * Field separator between positional values in a data row.
 * Also separates elements in one-liner arrays and fields in inline objects.
 * A literal `|` in source data MUST be escaped as `\|`.
 * @type {string}
 */
const FIELD_SEPARATOR = "|";

/**
 * Row prefix for each record in an array data block.
 * Appears at the indent level of the record, immediately before the first field.
 * @type {string}
 */
const ITEM_MARKER = "-";

/**
 * Default prefix for hint/comment lines.
 * Lines starting with this character are ignored by the decoder.
 * @type {string}
 */
const HINT_PREFIX = "#";

/**
 * One indentation unit. MOON uses a single space per nesting level.
 * At depth `n`, a line is prefixed with `n` spaces.
 * @type {string}
 */
const INDENT = " ";

/**
 * Maximum presence frequency below which a field is treated as variadic.
 *
 * Presence frequency is the fraction of records in which a field has a
 * non-null, non-undefined, non-missing value. Fields below this threshold
 * are omitted from the schema declaration and emitted inline as `key=value`
 * only when present. Fields at or above this threshold are declared in the
 * schema and emit `~` when absent.
 *
 * There is no optional tier — a field is either declared (always emitted,
 * `~` when absent) or variadic (emitted only when present). This threshold
 * is the single boundary between the two.
 *
 * @example
 * // Field present in 15% of records → variadic (0.15 < 0.2)
 * // Field present in 60% of records → declared, emits ~ when absent (0.6 >= 0.2)
 * // Field present in 100% of records → declared, never emits ~
 *
 * @type {number}
 */
const VARIADIC_MAX_FREQUENCY = 0.2;

/**
 * Prefix character for document-level directive lines.
 * Directives appear at the top of a MOON document and override default tokens.
 * @example `@null: ~`, `@sep:|`, `@item:-`
 * @type {string}
 */
const DIRECTIVE_PREFIX = "@";

/**
 * Directive key for the null marker token.
 * @example `@null: ~`
 * @type {string}
 */
const DIRECTIVE_NULL = "null";

/**
 * Directive key for the field separator token.
 * @example `@sep: |`
 * @type {string}
 */
const DIRECTIVE_SEP = "sep";

/**
 * Directive key for the array item row prefix token.
 * @example `@item: -`
 * @type {string}
 */
const DIRECTIVE_ITEM = "item";

/**
 * Directive key for the hint/comment prefix character (exactly 1 char).
 * Lines starting with this character are ignored by the decoder.
 * No default — hint lines are only recognized when @hint is declared.
 * @example `@hint: #`
 * @type {string}
 */
const DIRECTIVE_HINT = "hint";

/**
 * Directive key for the flat columnar schema example.
 * Emitted only when the document contains a flat columnar array.
 * @example `@ex_schema: u[3]{id|name}: - 1|Alice`
 * @type {string}
 */
const DIRECTIVE_EX_SCHEMA = "ex_schema";

/**
 * Directive key for the nested schema example.
 * Emitted only when the document contains a columnar array with nested object or array fields.
 * @example `@ex_nested: u[2]{val|obj{a|b}|arr[]}: - v|{x|y}|[a|b]`
 * @type {string}
 */
const DIRECTIVE_EX_NESTED = "ex_nested";

/**
 * Directive key for the grid schema example.
 * Emitted only when the document contains a grid (dimensions.length > 1).
 * @example `@ex_grid: m[2][3]: - 1|2|3`
 * @type {string}
 */
const DIRECTIVE_EX_GRID = "ex_grid";

/**
 * Directive key for the inline value encoding example.
 * Emitted only when the document contains inline [v1|v2] or {v1|v2} values in rows.
 * @example `@ex_inline: a[2]:x|y o:a=b|c=d`
 * @type {string}
 */
const DIRECTIVE_EX_INLINE = "ex_inline";

/**
 * Directive key for the variadic fields example.
 * Emitted only when the document contains an array with variadic fields.
 * @example `@ex_variadic: u[3]{id|name|...}: - 1|Alice -- 3|Carol|x=v`
 * @type {string}
 */
const DIRECTIVE_EX_VARIADIC = "ex_variadic";

/**
 * Static example value for @ex_schema.
 * Shows a flat columnar schema declaration and one data row.
 * @type {string}
 */
const EX_SCHEMA = "u[3]{id|name}: - 1|Alice";

/**
 * Static example value for @ex_nested.
 * Shows a columnar schema with nested object and array fields and one data row.
 * @type {string}
 */
const EX_NESTED = "u[2]{val|obj{a|b}|arr[]}: - v|{x|y}|[a|b]";

/**
 * Static example value for @ex_grid.
 * Shows a 2D grid schema and one data row.
 * @type {string}
 */
const EX_GRID = "m[2][3]: - 1|2|3";

/**
 * Static example value for @ex_inline.
 * Shows inline array and inline pure object encoding patterns.
 * @type {string}
 */
const EX_INLINE = "a[2]:x|y o:a=b|c=d";

/**
 * Static example value for @ex_variadic.
 * Shows a variadic schema and rows with and without extra key=value fields.
 * @type {string}
 */
const EX_VARIADIC = "u[3]{id|name|...}: - 1|Alice -- 3|Carol|x=v";

/**
 * Compression level: high — full MOON encoding with columnar arrays,
 * inline {v|v} and [v|v], and compact grids.
 * @type {string}
 */
const COMPRESSION_HIGH = "high";

/**
 * Compression level: medium — columnar only for flat primitive fields.
 * No inline {v|v} or [v|v]. Grids still compact.
 * @type {string}
 */
const COMPRESSION_MEDIUM = "medium";

/**
 * Compression level: low — TOON-like. No columnar encoding.
 * Every object expands as a block. Grids expand row-by-row.
 * @type {string}
 */
const COMPRESSION_LOW = "low";

/**
 * Default compression level.
 * @type {string}
 */
const DEFAULT_COMPRESSION = COMPRESSION_HIGH;

/**
 * Default value for addHints option.
 * @type {boolean}
 */
const ADD_HINTS = true;

/**
 * Default value for addDefinitions option.
 * @type {boolean}
 */
const ADD_DEFINITIONS = true;

/**
 * Default value for addSchemaExamples option.
 * @type {boolean}
 */
const ADD_SCHEMA_EXAMPLES = true;
module.exports = Object.freeze({
  NULL_MARKER,
  FIELD_SEPARATOR,
  ITEM_MARKER,
  HINT_PREFIX,
  INDENT,
  VARIADIC_MAX_FREQUENCY,
  COMPRESSION_HIGH,
  COMPRESSION_MEDIUM,
  COMPRESSION_LOW,
  DEFAULT_COMPRESSION,
  ADD_HINTS,
  ADD_DEFINITIONS,
  ADD_SCHEMA_EXAMPLES,
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
});