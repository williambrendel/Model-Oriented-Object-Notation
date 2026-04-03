"use strict";

/**
 * @file estimateTokens.js
 * @module benchmark/utilities/estimateTokens
 * @description A high-fidelity heuristic for estimating LLM token counts.
 * Optimized for technical formats (JSON, MOON, TOON) by accounting for 
 * BPE (Byte Pair Encoding) behaviors like whitespace merging and sigil batching.
 */

/**
 * Estimates the token count of a given text string using a weighted heuristic.
 *
 * @function estimateTokens
 * @param {string} text - The raw string to be analyzed.
 * @returns {number} The estimated total token count.
 */
const estimateTokens = text => {
  if (!text) return 0;

  // Regex breakdown:
  // 1. (\n[ \t]*)  : Newlines and their trailing indentation (usually 1 token total).
  // 2. ([a-zA-Z]+) : Alphabetic words/keys.
  // 3. ([0-9]+)    : Numeric sequences.
  // 4. ([^\w\s]+)  : Special character runs (sigils, brackets, etc).
  const chunks = text.match(/(\n[ \t]*)|([a-zA-Z]+)|([0-9]+)|([^\w\s]+)/g) || [];
  
  let total = 0;
  
  for (const chunk of chunks) {
    // 1. Whitespace Merge: EOL + Indentation is typically one token.
    if (chunk.startsWith('\n')) {
      total += 1;
    } 
    // 2. Alphabetic: Keys and values.
    else if (/^[a-zA-Z]+$/.test(chunk)) {
      // Floor-based approach: technical keys <= 5 chars are almost always 1 token.
      // Longer words use a 4-char denominator for technical density.
      total += (chunk.length <= 5) ? 1 : Math.ceil(chunk.length / 4);
    } 
    // 3. Numeric: Highly dense.
    else if (/^[0-9]+$/.test(chunk)) {
      // Average 3 digits per token.
      total += Math.ceil(chunk.length / 3);
    } 
    // 4. Special Characters: Sigil batching.
    else {
      // Logic: Tokenizers often merge characters like '": ' or ']]'.
      // Moving from 1:1 to 2:1 ratio to prevent JSON inflation.
      total += Math.ceil(chunk.length / 2);
    }
  }
  
  return Math.round(total);
};

/**
 * @ignore
 */
module.exports = Object.freeze(Object.defineProperty(estimateTokens, "estimateTokens", {
  value: estimateTokens,
  enumerable: true
}));