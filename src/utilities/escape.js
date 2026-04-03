"use strict";

/**
 * @file escape.js
 * @module moon/utilities/escape
 * @description Escapes raw string values for safe inclusion in a MOON data block.
 *
 * MOON defines the following escape sequences:
 *
 * | Raw character | Escaped form | Reason                                                    |
 * |---------------|--------------|-----------------------------------------------------------|
 * | `\`           | `\\`         | Backslash is the escape prefix                            |
 * | `|`           | `\|`         | Pipe is the MOON field delimiter                          |
 * | `~`           | `\~`         | Reserved MOON null token — must be escaped when literal   |
 * | `\n` (LF)     | `\n`         | Newlines break line-oriented parsing                      |
 * | `\r` (CR)     | `\r`         | Carriage returns break line endings                       |
 * | `\t`          | `\t`         | Tabs could corrupt indentation-sensitive contexts         |
 * | `\v`          | `\v`         | Vertical tab — non-printing, structurally unsafe          |
 * | `\f`          | `\f`         | Form feed — non-printing, structurally unsafe             |
 * | `\0`          | `\0`         | Null byte — breaks many parsers and LLM tokenizers        |
 * | `\u2028`      | `\u2028`     | Unicode Line Separator — treated as newline by JS/parsers |
 * | `\u2029`      | `\u2029`     | Unicode Paragraph Separator — treated as newline          |
 *
 * Backslash is processed first in the map so that subsequent replacements
 * do not double-escape characters already escaped in a previous pass.
 *
 * @example
 * const escape = require("./escape");
 * escape("hello|world");   // → "hello\\|world"
 * escape("line1\nline2");  // → "line1\\nline2"
 * escape("C:\\path");      // → "C:\\\\path"
 * escape("~");             // → "\\~"
 * escape(null);            // → null   (non-strings returned as-is)
 */

/**
 * Lookup table mapping raw characters to their MOON escape sequences.
 * Backslash is listed first so it is processed before any other character,
 * preventing double-escaping when the output is scanned again.
 *
 * @constant {Object.<string, string>}
 */
const ESCAPE_MAP = {
  "\\":     "\\\\",
  "|":      "\\|",
  "~":      "\\~",
  "\n":     "\\n",
  "\r":     "\\r",
  "\t":     "\\t",
  "\v":     "\\v",
  "\f":     "\\f",
  "\0":     "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};

/**
 * Escapes a string value for use in a MOON data block.
 *
 * Iterates the string character by character, replacing any character found
 * in {@link ESCAPE_MAP} with its escape sequence. Characters not in the map
 * are passed through unchanged. Non-string inputs are returned as-is to allow
 * safe use in encoding pipelines where the value type is not yet validated.
 *
 * @function escape
 * @param {string} str - The raw string value to escape.
 * @returns {string} The escaped string, safe for MOON data encoding.
 *   Returns the original value unchanged if it is falsy or not a string.
 *
 * @example
 * escape("Alice");            // → "Alice"
 * escape("pipe|delimited");   // → "pipe\\|delimited"
 * escape("two\nlines");       // → "two\\nlines"
 * escape("back\\slash");      // → "back\\\\slash"
 * escape("~");                // → "\\~"
 * escape("");                 // → ""  (empty string returned as-is)
 * escape(null);               // → null
 * escape(undefined);          // → undefined
 * escape(42);                 // → 42
 */
const escape = str => {
  if (!str || typeof str !== "string") return str;
  let output = "";
  for (let i = 0, l = str.length, o; i !== l; ++i) output += ESCAPE_MAP[o = str.charAt(i)] || o;
  return output;
};

/**
 * @ignore
 * Default export with freezing.
 */
module.exports = Object.freeze(Object.defineProperty(escape, "escape", {
  value: escape
}));