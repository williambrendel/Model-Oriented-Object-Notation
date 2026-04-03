"use strict";

/**
 * @example simple-array.js
 * Simple uniform array of objects — the base MOON case.
 * All fields are primitive → emitted as pipe-separated rows, one per record.
 */

const serialize = require("../src/serialize");

const data = {
  "items": [
    1,
    {
      "a": "hello",
      "b": "world"
    },
    "text value"
  ]
};

console.log("=== Input ===");
console.log(JSON.stringify(data, null, 2));

console.log("\n=== MOON output ===");
console.log(serialize(data));

// Output:
//  1|Alice|admin
//  2|Bob|user
//  3|Carol|user