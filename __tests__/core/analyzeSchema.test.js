"use strict";

const analyzeSchema = require("../../src/core/analyzeSchema");

describe("analyzeSchema", () => {

  // ── Primitives ─────────────────────────────────────────────────────────────

  describe("primitives", () => {
    test("returns primitive descriptor for a number", () => {
      expect(analyzeSchema(42).type).toBe("primitive");
    });

    test("returns primitive descriptor for a string", () => {
      expect(analyzeSchema("hello").type).toBe("primitive");
    });

    test("returns primitive descriptor for a boolean", () => {
      expect(analyzeSchema(true).type).toBe("primitive");
    });

    test("returns primitive descriptor for null", () => {
      expect(analyzeSchema(null).type).toBe("primitive");
    });

    test("returns primitive descriptor for undefined", () => {
      expect(analyzeSchema(undefined).type).toBe("primitive");
    });
  });

  // ── Plain objects ──────────────────────────────────────────────────────────

  describe("plain objects", () => {
    test("analyses a flat object with all required fields", () => {
      const result = analyzeSchema({ id: 1, name: "Alice" });
      expect(result.type).toBe("object");
      expect(result.fields).toHaveLength(2);
      expect(result.fields[0]).toMatchObject({ name: "id",   frequency: 1 });
      expect(result.fields[1]).toMatchObject({ name: "name", frequency: 1 });
    });

    test("all fields in a single object have frequency 1", () => {
      const result = analyzeSchema({ a: 1, b: 2, c: 3 });
      result.fields.forEach(f => expect(f.frequency).toBe(1));
    });

    test("nested object produces nested object descriptor", () => {
      const result  = analyzeSchema({ id: 1, address: { city: "Paris", zip: "75001" } });
      const address = result.fields.find(f => f.name === "address");
      expect(address.type).toBe("object");
      expect(address.fields).toHaveLength(2);
    });
  });

  // ── Empty array ────────────────────────────────────────────────────────────

  describe("empty array", () => {
    test("returns array descriptor with dimensions [0]", () => {
      const result = analyzeSchema([]);
      expect(result.type).toBe("array");
      expect(result.dimensions).toEqual([0]);
      expect(result.fields).toEqual([]);
    });
  });

  // ── 1D primitive arrays ────────────────────────────────────────────────────

  describe("1D primitive arrays", () => {
    test("analyses array of numbers", () => {
      const result = analyzeSchema([1, 2, 3]);
      expect(result.type).toBe("array");
      expect(result.dimensions).toEqual([3]);
      expect(result.elementType).toBe("primitive");
      expect(result.fields).toEqual([]);
    });

    test("top-level array always has fixed first dimension", () => {
      expect(analyzeSchema([1, 2, 3, 4, 5]).dimensions).toEqual([5]);
    });

    test("isOneLiner is true when no element contains pipe", () => {
      expect(analyzeSchema(["core", "revenue", "critical"]).isOneLiner).toBe(true);
    });

    test("isOneLiner is false when any element contains pipe", () => {
      expect(analyzeSchema(["hello|world", "foo"]).isOneLiner).toBe(false);
    });

    test("isOneLiner is true for numeric arrays", () => {
      expect(analyzeSchema([1, 2, 3]).isOneLiner).toBe(true);
    });
  });

  // ── 1D object arrays ───────────────────────────────────────────────────────

  describe("1D object arrays", () => {
    const data = [
      { id: 1, name: "Alice", role: "admin" },
      { id: 2, name: "Bob",   role: "user"  },
      { id: 3, name: "Carol", role: "user"  }
    ];

    test("detects object array with correct dimensions", () => {
      const result = analyzeSchema(data);
      expect(result.type).toBe("array");
      expect(result.elementType).toBe("object");
      expect(result.dimensions).toEqual([3]);
    });

    test("all fields required when always present with non-null values", () => {
      analyzeSchema(data).fields.forEach(f => expect(f.frequency).toBe(1));
    });

    test("produces correct field names in order", () => {
      expect(analyzeSchema(data).fields.map(f => f.name)).toEqual(["id", "name", "role"]);
    });

    test("all field descriptors are primitives", () => {
      analyzeSchema(data).fields.forEach(f => expect(f.type).toBe("primitive"));
    });
  });

  // ── 2D grids ───────────────────────────────────────────────────────────────

  describe("2D grids", () => {
    test("detects 2D grid dimensions", () => {
      const result = analyzeSchema([[1, 2, 3], [4, 5, 6]]);
      expect(result.type).toBe("array");
      expect(result.dimensions).toEqual([2, 3]);
      expect(result.elementType).toBe("primitive");
    });

    test("2D grid with nulls in rows preserves dimensions", () => {
      const result = analyzeSchema([[1, null, 3], [4, 5, null]]);
      expect(result.dimensions).toEqual([2, 3]);
      expect(result.elementType).toBe("primitive");
    });

    test("2D grid isOneLiner reflects leaf element values", () => {
      expect(analyzeSchema([[1, 2], [3, 4]]).isOneLiner).toBe(true);
      expect(analyzeSchema([["a|b", "c"], ["d", "e"]]).isOneLiner).toBe(false);
    });
  });

  // ── 3D grids ───────────────────────────────────────────────────────────────

  describe("3D grids", () => {
    test("detects 3D grid dimensions", () => {
      const grid = [
        [[1, 2, 3, 4], [5, 6, 7, 8],  [9, 10, 11, 12]],
        [[13,14,15,16],[17,18,19,20],[21, 22, 23, 24]]
      ];
      const result = analyzeSchema(grid);
      expect(result.dimensions).toEqual([2, 3, 4]);
      expect(result.elementType).toBe("primitive");
    });
  });

  // ── Grid of objects ────────────────────────────────────────────────────────

  describe("grid of objects", () => {
    test("detects grid of objects with correct dimensions and fields", () => {
      const data = [
        [{ amplitude: 0.5, phase: 0.2, probability: 0.25 }, { amplitude: 0.3, phase: 0.8, probability: 0.15 }],
        [{ amplitude: 0.7, phase: 0.1, probability: 0.35 }, { amplitude: 0.2, phase: 0.5, probability: 0.20 }],
        [{ amplitude: 0.4, phase: 0.6, probability: 0.30 }, { amplitude: 0.1, phase: 0.3, probability: 0.10 }]
      ];
      const result = analyzeSchema(data);
      expect(result.dimensions).toEqual([3, 2]);
      expect(result.elementType).toBe("object");
      expect(result.fields.map(f => f.name)).toEqual(["amplitude", "phase", "probability"]);
      expect(result.isOneLiner).toBe(false);
    });
  });

  // ── Nested arrays as object fields ────────────────────────────────────────

  describe("nested array fields", () => {
    test("consistent-length primitive array field gets fixed dimension", () => {
      const data = [
        { id: 1, coords: [48.85, 2.35]  },
        { id: 2, coords: [51.50, 0.12]  },
        { id: 3, coords: [40.71, 74.00] }
      ];
      const coords = analyzeSchema(data).fields.find(f => f.name === "coords");
      expect(coords.dimensions).toEqual([2]);
    });

    test("varying-length array field gets null dimension", () => {
      const data = [
        { id: 1, tags: ["a", "b"]      },
        { id: 2, tags: ["x"]           },
        { id: 3, tags: ["p", "q", "r"] }
      ];
      const tags = analyzeSchema(data).fields.find(f => f.name === "tags");
      expect(tags.dimensions).toEqual([null]);
    });

    test("consistent-length object array field gets fixed dimension", () => {
      const data = [
        { name: "Eng", teams: [{ name: "Backend"  }] },
        { name: "Mkt", teams: [{ name: "Growth"   }] },
        { name: "Ops", teams: [{ name: "DevOps"   }] }
      ];
      const teams = analyzeSchema(data).fields.find(f => f.name === "teams");
      expect(teams.dimensions).toEqual([1]);
      expect(teams.elementType).toBe("object");
    });

    test("nested 2D grid field gets two-entry dimensions", () => {
      // Single parent with a 3×4 matrix field
      const data = { matrix: [[1,2,3,4],[5,6,7,8],[9,10,11,12]] };
      const matrix = analyzeSchema(data).fields.find(f => f.name === "matrix");
      expect(matrix.dimensions).toEqual([3, 4]);
    });
  });

  // ── Variadic fields ────────────────────────────────────────────────────────

  describe("variadic fields", () => {
  test("marks parent variadic when key appears below variadicMaxFrequency", () => {
    const data = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob"   },
      { id: 3, name: "Carol" },
      { id: 4, name: "Dave"  },
      { id: 5, name: "Eve"   },
      { id: 6, name: "Frank", note: "rare" }
    ];
    expect(analyzeSchema(data).fields.some(f => f.variadic)).toBe(true);
  });

  test("rare key has frequency below variadicMaxFrequency and variadic: true", () => {
    const data = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob"   },
      { id: 3, name: "Carol" },
      { id: 4, name: "Dave"  },
      { id: 5, name: "Eve"   },
      { id: 6, name: "Frank", note: "rare" }
    ];
    const note = analyzeSchema(data).fields.find(f => f.name === "note");
    expect(note).toBeDefined();
    expect(note.frequency).toBeLessThan(0.2);
    expect(note.variadic).toBe(true);
  });

  test("declared field has variadic: false", () => {
    const data = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
    analyzeSchema(data).fields.forEach(f => expect(f.variadic).toBe(false));
  });

  test("variadic is false when all keys meet threshold", () => {
    const data = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob"   },
      { id: 3, name: "Carol" }
    ];
    expect(analyzeSchema(data).fields.some(f => f.variadic)).toBe(false);
  });

  test("key at exactly variadicMaxFrequency with short key is variadic (n-aware)", () => {
    // note (4 chars) appears in 1/5 = 0.20, exactly at floor threshold
    // n-aware break-even for 4-char key with n=5 = (5+4+1)/(5×5) = 0.40
    // 0.20 < 0.40 → variadic (n-aware formula)
    const data = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob"   },
      { id: 3, name: "Carol" },
      { id: 4, name: "Dave"  },
      { id: 5, name: "Eve", note: "x" }
    ];
    const result = analyzeSchema(data);
    const note   = result.fields.find(f => f.name === "note");
    expect(note.frequency).toBe(0.2);
    expect(result.fields.some(f => f.variadic)).toBe(true); // ← CHANGED: now variadic
  });

  test("short key above floor but below break-even is variadic", () => {
    // "x" (1 char), n-aware break-even = (5+1+1)/(5×2) = 7/10 = 0.70
    // f=0.20 < 0.70 → variadic
    const data = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob"   },
      { id: 3, name: "Carol" },
      { id: 4, name: "Dave"  },
      { id: 5, name: "Eve", x: "v" }
    ];
    const result = analyzeSchema(data);
    const field  = result.fields.find(f => f.name === "x");
    expect(field.frequency).toBe(0.2);
    expect(field.variadic).toBe(true);
  });

  test("null and missing key are treated identically for frequency", () => {
    const withNull    = [{ id: 1, role: "Lead" }, { id: 2, role: null }];
    const withMissing = [{ id: 1, role: "Lead" }, { id: 2             }];
    const f1 = analyzeSchema(withNull).fields.find(f    => f.name === "role").frequency;
    const f2 = analyzeSchema(withMissing).fields.find(f => f.name === "role").frequency;
    expect(f1).toBe(f2);
  });

  test("custom variadicMaxFrequency option is respected", () => {
    // extra appears in 2/3 ≈ 0.67, above default 0.2 but below custom 0.9
    const data = [
      { id: 1, name: "Alice", extra: "x" },
      { id: 2, name: "Bob",   extra: "y" },
      { id: 3, name: "Carol"             }
    ];
    const result = analyzeSchema(data, { variadicMaxFrequency: 0.9 });
    expect(result.fields.some(f => f.variadic)).toBe(true);
    expect(result.fields.find(f => f.name === "extra").frequency).toBeLessThan(0.9);
  });
});

  // ── Nested objects ─────────────────────────────────────────────────────────

  describe("nested objects", () => {
    test("recursively analyses nested objects", () => {
      const data = [
        { id: 1, address: { city: "Paris",  zip: "75001" } },
        { id: 2, address: { city: "London", zip: "SW1A"  } }
      ];
      const address = analyzeSchema(data).fields.find(f => f.name === "address");
      expect(address.type).toBe("object");
      expect(address.fields.map(f => f.name)).toEqual(["city", "zip"]);
    });

    test("deeply nested array of objects is analysed recursively", () => {
      const data = [
        { id: 1, teams: [{ name: "Backend",  size: 3 }] },
        { id: 2, teams: [{ name: "Frontend", size: 2 }] }
      ];
      const teams = analyzeSchema(data).fields.find(f => f.name === "teams");
      expect(teams.type).toBe("array");
      expect(teams.elementType).toBe("object");
      expect(teams.fields.map(f => f.name)).toEqual(["name", "size"]);
    });
  });

  // ── Mixed arrays ───────────────────────────────────────────────────────────

  describe("mixed arrays", () => {
    test("mixed primitive subtypes are still elementType primitive", () => {
      const result = analyzeSchema([1, "two", true]);
      expect(result.elementType).toBe("primitive");
    });

    test("array mixing objects and primitives produces mixed elementType", () => {
      expect(analyzeSchema([{ id: 1 }, "string", 42]).elementType).toBe("mixed");
    });
  });

  // ── Null handling ──────────────────────────────────────────────────────────

  describe("null handling in arrays", () => {
    test("null elements in object array are skipped for field analysis", () => {
      const data   = [{ id: 1, name: "Alice" }, null, { id: 3, name: "Carol" }];
      const result = analyzeSchema(data);
      expect(result.elementType).toBe("object");
      expect(result.fields).toHaveLength(2);
    });
  });

});