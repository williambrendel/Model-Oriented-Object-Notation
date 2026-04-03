"use strict";

const analyzeSchema       = require("./core/analyzeSchema");
const { serializeObject, serializeArray } = require("./core/serializeObject");
const serializeDirectives = require("./core/serializeDirectives");
const serializeValue      = require("./core/serializeValue");
const applyReplacer       = require("./utilities/applyReplacer");
const { VARIADIC_MAX_FREQUENCY, HINT_PREFIX, DEFAULT_COMPRESSION } = require("./constants");

/**
 * @file serialize.js
 * @module moon/serialize
 * @description Top-level MOON serializer. Converts any JavaScript value to a
 * MOON-encoded string, including the document header directives.
 *
 * ## Output structure
 *
 * ```
 * @null:~
 * @sep:|
 * @item:-
 * <encoded value>
 * ```
 *
 * The three directive lines are always emitted first so the document is
 * self-contained — a decoder never needs external context to parse it.
 *
 * ## Root value dispatch
 *
 * | Root type  | Encoding                                      |
 * |------------|-----------------------------------------------|
 * | primitive  | Emitted as a bare value on one line           |
 * | object     | `serializeObject` at depth 0                  |
 * | array      | `serializeArray` with root name `""`, depth 0 |
 *
 * ## Options
 *
 * | Option                  | Default | Description                              |
 * |-------------------------|---------|------------------------------------------|
 * | `replacer`              | null    | `(key, value) => value` transform        |
 * | `variadicMaxFrequency`  | 0.2     | Fields below this frequency are variadic |
 *
 * @example
 * serialize({ name: "Acme", tags: ["tech", "startup"] });
 * // "@null:~\n@sep:|\n@item:-\nname=Acme\ntags[2]: tech|startup"
 *
 * @example
 * serialize([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]);
 * // "@null:~\n@sep:|\n@item:-\n[2]{id|name}:\n- 1|Alice\n- 2|Bob"
 *
 * @example
 * // Omit sensitive fields via replacer
 * serialize(data, { replacer: (key, val) => key === "password" ? undefined : val });
 */

/**
 * @typedef {Object} SerializeOptions
 * @property {Function|null} [replacer=null]              - JSON.stringify-style replacer.
 *   Called as `(key, value)` for every key/index. Return `undefined` to omit.
 * @property {number}        [variadicMaxFrequency=0.2]   - Variadic field threshold.
 * @property {string}        [nullMarker="~"]             - Override null token.
 * @property {string}        [fieldSeparator="|"]         - Override field separator.
 * @property {string}        [itemMarker="-"]             - Override item marker.
 */

/**
 * Serializes a JavaScript value to a MOON string.
 *
 * @function serialize
 * @param {*}               value     - The value to serialize.
 * @param {SerializeOptions} [options]
 * @returns {string} Complete MOON document including directive header.
 *
 * @example
 * serialize(42);
 * // "@null:~\n@sep:|\n@item:-\n42"
 *
 * @example
 * serialize({ id: 1, name: "Alice" });
 * // "@null:~\n@sep:|\n@item:-\nid=1\nname=Alice"
 *
 * @example
 * serialize([1, 2, 3]);
 * // "@null:~\n@sep:|\n@item:-\n[3]: 1|2|3"
 */
const serialize = (value, options = {}) => {
  const {
    replacer              = null,
    variadicMaxFrequency  = VARIADIC_MAX_FREQUENCY,
    nullMarker,
    fieldSeparator,
    itemMarker,
    hintPrefix            = HINT_PREFIX,
    addDefinitions        = true,
    addSchemaExamples     = true,
    addHints              = true,
    compression           = DEFAULT_COMPRESSION,
  } = options;

  // ── Apply replacer ─────────────────────────────────────────────────────────
  const data = replacer ? applyReplacer("", value, replacer) : value;

  // ── Context — accumulates feature flags during serialization ───────────────
  const context = {
    hasNull:     false,
    hasSchema:   false,
    hasNested:   false,
    hasGrid:     false,
    hasInline:   false,
    hasVariadic: false,
    hasSep:      false,
    hasItem:     false,
    hasHints:    false,
  };

  // ── Serialization opts passed through the pipeline ─────────────────────────
  const opts = { addHints, hintPrefix, compression };

  // ── Encode ─────────────────────────────────────────────────────────────────
  let body;

  if (data === null || data === undefined) {
    body = "~";
  } else if (Array.isArray(data)) {
    const descriptor = analyzeSchema(data, { variadicMaxFrequency });
    body = serializeArray("", data, descriptor, 0, context, opts);
  } else if (typeof data === "object") {
    body = serializeObject(data, 0, context, opts);
  } else {
    body = serializeValue(data);
  }

  // ── Detect hasNull from body ───────────────────────────────────────────────
  if (body.includes("~")) context.hasNull = true;

  // ── Directives — emitted after serialization so context flags are populated ─
  const header = serializeDirectives(
    { nullMarker, fieldSeparator, itemMarker, hintPrefix: context.hasHints ? hintPrefix : null, addDefinitions, addSchemaExamples },
    context
  );

  return header ? `${header}\n\n${body}` : body;
};

/**
 * @ignore
 * Default export with freezing.
 */
module.exports = Object.freeze(Object.defineProperty(serialize, "serialize", {
  value: serialize
}));