"use strict";

const serializeSchema = require("../../src/core/serializeSchema");
const analyzeSchema   = require("../../src/core/analyzeSchema");

// ── Helpers ────────────────────────────────────────────────────────────────
// Build descriptors via analyzeSchema to keep tests realistic and avoid
// hand-rolling descriptor shapes that could drift from the real analyzer.

const desc = value => analyzeSchema(value);

describe("serializeSchema", () => {

  // ── Guards ─────────────────────────────────────────────────────────────────

  describe("guards", () => {
    test("throws TypeError for primitive descriptor", () => {
      expect(() => serializeSchema("x", { type: "primitive" }))
        .toThrow(TypeError);
    });

    test("throws TypeError for object descriptor", () => {
      expect(() => serializeSchema("x", { type: "object", fields: [], variadic: false }))
        .toThrow(TypeError);
    });

    test("error message names the offending type", () => {
      expect(() => serializeSchema("x", { type: "object", fields: [], variadic: false }))
        .toThrow(/object/);
    });
  });

  // ── 1D primitive arrays ────────────────────────────────────────────────────

  describe("1D primitive arrays", () => {
    test("fixed-length", () => {
      expect(serializeSchema("tags", desc(["core", "revenue", "critical"])))
        .toBe("tags[3]:");
    });

    test("variable-length emits []", () => {
      // Simulate variable-length by passing a descriptor with null dimension directly
      const d = { type: "array", dimensions: [null], elementType: "primitive", isOneLiner: true, variadic: false, fields: [] };
      expect(serializeSchema("tags", d)).toBe("tags[]:");
    });

    test("single element", () => {
      expect(serializeSchema("codes", desc(["X42"]))).toBe("codes[1]:");
    });

    test("numeric elements", () => {
      expect(serializeSchema("scores", desc([95, 87, 92]))).toBe("scores[3]:");
    });
  });

  // ── 2D grids ───────────────────────────────────────────────────────────────

  describe("2D grids", () => {
    test("fixed dimensions", () => {
      const matrix = [[98.5, 85.3, 92.1], [87.2, 91.4, 88.9]];
      expect(serializeSchema("matrix", desc(matrix))).toBe("matrix[2][3]:");
    });

    test("square grid", () => {
      const grid = [[1, 2], [3, 4]];
      expect(serializeSchema("grid", desc(grid))).toBe("grid[2][2]:");
    });
  });

  // ── 3D grids ───────────────────────────────────────────────────────────────

  describe("3D grids", () => {
    test("sensor_grid[2][3][4]", () => {
      const grid = [
        [[1,2,3,4],[5,6,7,8],[9,10,11,12]],
        [[13,14,15,16],[17,18,19,20],[21,22,23,24]]
      ];
      expect(serializeSchema("sensor_grid", desc(grid))).toBe("sensor_grid[2][3][4]:");
    });
  });

  // ── 1D object arrays ───────────────────────────────────────────────────────

  describe("1D object arrays", () => {
    test("flat primitive fields", () => {
      const data = [
        { id: 1, name: "Alice", role: "admin" },
        { id: 2, name: "Bob",   role: "user"  }
      ];
      expect(serializeSchema("users", desc(data))).toBe("users[2]{id|name|role}:");
    });

    test("single field", () => {
      expect(serializeSchema("items", desc([{ name: "a" }, { name: "b" }])))
        .toBe("items[2]{name}:");
    });
  });

  // ── Nested primitive array fields ──────────────────────────────────────────

  describe("nested primitive array fields", () => {
    test("consistent-length nested array gets [n]", () => {
      const data = [
        { name: "A", coords: [10, 20] },
        { name: "B", coords: [30, 40] }
      ];
      expect(serializeSchema("teams", desc(data))).toBe("teams[2]{name|coords[2]}:");
    });

    test("variable-length nested array gets []", () => {
      const data = [
        { name: "A", tags: ["x", "y", "z"] },
        { name: "B", tags: ["p"]            }
      ];
      expect(serializeSchema("items", desc(data))).toBe("items[2]{name|tags[]}:");
    });

    test("multiple nested array fields", () => {
      const data = [
        { name: "Backend",  members: ["Alice", "Bob", "Carol"], scores: [95, 87, 92, 88, 91] },
        { name: "Frontend", members: ["Dave",  "Eve"          ], scores: [85, 90, 88, 91, 87] }
      ];
      // members varies (3 vs 2) → [], scores consistent (5) → [5]
      expect(serializeSchema("teams", desc(data))).toBe("teams[2]{name|members[]|scores[5]}:");
    });
  });

  // ── Nested object fields ───────────────────────────────────────────────────

  describe("nested object fields", () => {
    test("inline nested object", () => {
      const data = [
        { id: "P1", lead: { id: 1, name: "Alice" } },
        { id: "P2", lead: { id: 2, name: "Bob"   } }
      ];
      expect(serializeSchema("projects", desc(data))).toBe("projects[2]{id|lead{id|name}}:");
    });

    test("nested object with array sub-field", () => {
      const data = [
        { id: "X1", specs: { performance: ["95%", "98%", "97%"], weight: "2.5kg" } },
        { id: "X2", specs: { performance: ["88%", "92%", "90%"], weight: "1.8kg" } }
      ];
      expect(serializeSchema("prototypes", desc(data)))
        .toBe("prototypes[2]{id|specs{performance[3]|weight}}:");
    });
  });

  // ── Grid of objects ────────────────────────────────────────────────────────

  describe("grid of objects", () => {
    test("quantum_states[3][2]{amplitude|phase|probability}", () => {
      const data = [
        [{ amplitude: 0.5, phase: 0.2, probability: 0.25 }, { amplitude: 0.3, phase: 0.8, probability: 0.15 }],
        [{ amplitude: 0.7, phase: 0.1, probability: 0.35 }, { amplitude: 0.2, phase: 0.5, probability: 0.20 }],
        [{ amplitude: 0.4, phase: 0.6, probability: 0.30 }, { amplitude: 0.1, phase: 0.3, probability: 0.10 }]
      ];
      expect(serializeSchema("quantum_states", desc(data)))
        .toBe("quantum_states[3][2]{amplitude|phase|probability}:");
    });
  });

  // ── Variadic fields ────────────────────────────────────────────────────────

  describe("variadic fields", () => {
    test("appends ... when any field is variadic", () => {
      // note appears in 1/6 ≈ 0.167 < 0.2 → variadic
      const data = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob"   },
        { id: 3, name: "Carol" },
        { id: 4, name: "Dave"  },
        { id: 5, name: "Eve"   },
        { id: 6, name: "Frank", note: "rare" }
      ];
      expect(serializeSchema("users", desc(data))).toBe("users[6]{id|name|...}:");
    });

    test("variadic field is not listed by name", () => {
      const data = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob"   },
        { id: 3, name: "Carol" },
        { id: 4, name: "Dave"  },
        { id: 5, name: "Eve"   },
        { id: 6, name: "Frank", note: "rare" }
      ];
      const result = serializeSchema("users", desc(data));
      expect(result).not.toContain("note");
    });

    test("no ... when no variadic fields", () => {
      const data = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
      expect(serializeSchema("users", desc(data))).not.toContain("...");
    });

    test("custom variadicMaxFrequency option is respected", () => {
      // role at 2/3 ≈ 0.67 — above default 0.2 but below custom 0.9 → variadic
      const data = [
        { id: 1, name: "Alice", role: "admin" },
        { id: 2, name: "Bob",   role: "user"  },
        { id: 3, name: "Carol"                }
      ];
      const result = serializeSchema("users", analyzeSchema(data, { variadicMaxFrequency: 0.9 }));
      expect(result).toBe("users[3]{id|name|...}:");
      expect(result).not.toContain("role");
    });
  });

  // ── Output format ──────────────────────────────────────────────────────────

  describe("output format", () => {
    test("always ends with colon", () => {
      expect(serializeSchema("tags", desc(["a", "b", "c"]))).toMatch(/:$/);
    });

    test("starts with field name", () => {
      expect(serializeSchema("myField", desc([1, 2, 3]))).toMatch(/^myField/);
    });

    test("is a single line with no newlines", () => {
      const data = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
      expect(serializeSchema("users", desc(data))).not.toContain("\n");
    });
  });

  // ── Module ─────────────────────────────────────────────────────────────────

  describe("module", () => {
    test("is a function", () => {
      expect(typeof serializeSchema).toBe("function");
    });

    test("is frozen", () => {
      expect(Object.isFrozen(serializeSchema)).toBe(true);
    });
  });

});