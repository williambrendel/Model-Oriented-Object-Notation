"use strict";

/**
 * @example replacer.js
 * Replacer function — filter and transform values before serialization.
 * Mirrors JSON.stringify replacer semantics exactly:
 * - Called as (key, value) for every key in objects and every index in arrays.
 * - Return undefined to omit the key entirely.
 * - Return any other value to substitute it (recursed into).
 * - Root call uses key="" and value=the root data.
 */

const serialize = require("../src/serialize");

// ── Example 1: Remove sensitive fields ────────────────────────────────────────

const users = [
  { id: 1, name: "Alice", password: "s3cr3t",  email: "alice@acme.com", role: "admin" },
  { id: 2, name: "Bob",   password: "hunter2", email: "bob@acme.com",   role: "user"  }
];

console.log("=== Input (with passwords) ===");
console.log(JSON.stringify(users, null, 2));

console.log("\n=== MOON output (password removed) ===");
console.log(serialize(users, {
  replacer: (key, value) => key === "password" ? undefined : value
}));

// Output:
//  1|Alice|alice@acme.com|admin
//  2|Bob|bob@acme.com|user

// ── Example 2: Transform string values to uppercase ───────────────────────────

const statuses = [
  { id: 1, name: "Alice", status: "active"   },
  { id: 2, name: "Bob",   status: "inactive" }
];

console.log("\n=== Input (mixed case) ===");
console.log(JSON.stringify(statuses, null, 2));

console.log("\n=== MOON output (strings uppercased) ===");
console.log(serialize(statuses, {
  replacer: (key, value) => typeof value === "string" ? value.toUpperCase() : value
}));

// Output:
//  1|ALICE|ACTIVE
//  2|BOB|INACTIVE

// ── Example 3: Mask sensitive values ──────────────────────────────────────────

const logs = [
  { ts: "2026-03-28T10:00:00Z", level: "info",  msg: "Server started",    ip: "192.168.1.1" },
  { ts: "2026-03-28T10:01:00Z", level: "error", msg: "Auth failed",       ip: "10.0.0.5"   },
  { ts: "2026-03-28T10:02:00Z", level: "info",  msg: "Request processed", ip: "192.168.1.2" }
];

console.log("\n=== Input (with IPs) ===");
console.log(JSON.stringify(logs, null, 2));

console.log("\n=== MOON output (IPs masked) ===");
console.log(serialize(logs, {
  replacer: (key, value) => key === "ip" ? "x.x.x.x" : value
}));

// Output:
//  2026-03-28T10:00:00Z|info|Server started|x.x.x.x
//  2026-03-28T10:01:00Z|error|Auth failed|x.x.x.x
//  2026-03-28T10:02:00Z|info|Request processed|x.x.x.x