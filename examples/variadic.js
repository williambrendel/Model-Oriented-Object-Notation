"use strict";

/**
 * @example variadic.js
 * Variadic fields — rare keys absorbed into ... in the schema.
 *
 * Keys present in fewer than `variadicThreshold` of records are not declared
 * as schema fields. They appear as key=value extras at the end of the data row,
 * pipe-separated after the positional fields.
 *
 * The threshold is tunable — lower it to promote more keys into declared fields.
 */

const serialize = require("../src/serialize");

const users = [
  { id: 1, name: "Alice", role: "admin"                              },
  { id: 2, name: "Bob",   role: "user"                               },
  { id: 3, name: "Carol", role: "user",  note: "legacy account"      },
  { id: 4, name: "Dave",  role: "admin"                              },
  { id: 5, name: "Eve",   role: "user",  badge: "gold", note: "vip"  }
];

console.log("=== Input ===");
console.log(JSON.stringify(users, null, 2));

// Default threshold 0.5: keys in < 50% of records → variadic
// note  appears in 2/5 = 40% → variadic → key=value extra
// badge appears in 1/5 = 20% → variadic → key=value extra
console.log("\n=== MOON output (default threshold 0.5) ===");
console.log(serialize(users));

// Output:
//  1|Alice|admin
//  2|Bob|user
//  3|Carol|user|note=legacy account
//  4|Dave|admin
//  5|Eve|user|badge=gold|note=vip

// Lower threshold: note (40%) now promoted to declared optional field
console.log("\n=== MOON output (variadicThreshold=0.2, optionalThreshold=0.3) ===");
console.log(serialize(users, { variadicThreshold: 0.2, optionalThreshold: 0.3 }));

// Output:
//  1|Alice|admin|~|~
//  2|Bob|user|~|~
//  3|Carol|user|legacy account|~
//  4|Dave|admin|~|~
//  5|Eve|user|vip|gold