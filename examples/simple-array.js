"use strict";

/**
 * @example simple-array.js
 * Simple uniform array of objects — the base MOON case.
 * All fields are primitive → emitted as pipe-separated rows, one per record.
 */

const serialize = require("../src/serialize");

const users = [
  { id: 1, name: "Alice", role: "admin" },
  { id: 2, name: "Bob",   role: "user"  },
  { id: 3, name: "Carol", role: "user"  }
];

console.log("=== Input ===");
console.log(JSON.stringify(users, null, 2));

console.log("\n=== MOON output ===");
console.log(serialize(users));

// Output:
//  1|Alice|admin
//  2|Bob|user
//  3|Carol|user