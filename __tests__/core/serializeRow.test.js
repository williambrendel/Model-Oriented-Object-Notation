"use strict";

const serializeRow  = require("../../src/core/serializeRow");
const analyzeSchema = require("../../src/core/analyzeSchema");

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the fields array from an object array descriptor.
 * Convenience so tests read as: fields([{...},{...}])
 */
const fields = data => analyzeSchema(data).fields;

describe("serializeRow", () => {

  // ── Flat primitive fields ──────────────────────────────────────────────────

  describe("flat primitive fields", () => {
    const data = [
      { id: 1, name: "Alice", role: "admin" },
      { id: 2, name: "Bob",   role: "user"  }
    ];

    test("all fields present", () => {
      expect(serializeRow({ id: 1, name: "Alice", role: "admin" }, fields(data)))
        .toBe("- 1|Alice|admin");
    });

    test("starts with item marker", () => {
      expect(serializeRow({ id: 1, name: "Alice", role: "admin" }, fields(data)))
        .toMatch(/^- /);
    });

    test("absent field (null) emits ~", () => {
      expect(serializeRow({ id: 2, name: "Bob", role: null }, fields(data)))
        .toBe("- 2|Bob|~");
    });

    test("absent field (undefined) emits ~", () => {
      expect(serializeRow({ id: 2, name: "Bob" }, fields(data)))
        .toBe("- 2|Bob|~");
    });

    test("null and missing key produce identical output", () => {
      const withNull    = serializeRow({ id: 2, name: "Bob", role: null      }, fields(data));
      const withMissing = serializeRow({ id: 2, name: "Bob"                  }, fields(data));
      expect(withNull).toBe(withMissing);
    });
  });

  // ── Null record ────────────────────────────────────────────────────────────

  describe("null and undefined records", () => {
    const data = [{ id: 1, name: "Alice" }];

    test("null record emits ~ for every declared field", () => {
      expect(serializeRow(null, fields(data))).toBe("- ~|~");
    });

    test("undefined record emits ~ for every declared field", () => {
      expect(serializeRow(undefined, fields(data))).toBe("- ~|~");
    });
  });

  // ── Nested array fields ────────────────────────────────────────────────────

  describe("nested array fields", () => {
    test("1D primitive array field → [v|v|v]", () => {
      const data = [
        { name: "Backend",  coords: [10, 20] },
        { name: "Frontend", coords: [30, 40] }
      ];
      expect(serializeRow({ name: "Backend", coords: [10, 20] }, fields(data)))
        .toBe("- Backend|[10|20]");
    });

    test("absent array field → ~", () => {
      const data = [
        { name: "Backend",  coords: [10, 20] },
        { name: "Frontend", coords: [30, 40] }
      ];
      expect(serializeRow({ name: "Backend", coords: null }, fields(data)))
        .toBe("- Backend|~");
    });

    test("multiple array fields", () => {
      const data = [
        { name: "Backend",  members: ["Alice", "Bob"], scores: [95, 87] },
        { name: "Frontend", members: ["Dave",  "Eve"], scores: [85, 90] }
      ];
      expect(serializeRow({ name: "Backend", members: ["Alice", "Bob"], scores: [95, 87] }, fields(data)))
        .toBe("- Backend|[Alice|Bob]|[95|87]");
    });
  });

  // ── Nested object fields ───────────────────────────────────────────────────

  describe("nested object fields", () => {
    test("nested object → {v|v}", () => {
      const data = [
        { id: "P1", lead: { id: 1, name: "Alice" } },
        { id: "P2", lead: { id: 2, name: "Bob"   } }
      ];
      expect(serializeRow({ id: "P1", lead: { id: 1, name: "Alice" } }, fields(data)))
        .toBe("- P1|{1|Alice}");
    });

    test("nested object with array sub-field", () => {
      const data = [
        { id: "X1", specs: { performance: ["95%", "98%", "97%"], weight: "2.5kg" } },
        { id: "X2", specs: { performance: ["88%", "92%", "90%"], weight: "1.8kg" } }
      ];
      expect(serializeRow({ id: "X1", specs: { performance: ["95%", "98%", "97%"], weight: "2.5kg" } }, fields(data)))
        .toBe("- X1|{[95%|98%|97%]|2.5kg}");
    });
  });

  // ── Variadic extras ────────────────────────────────────────────────────────

  describe("variadic extras", () => {
    // note at 1/6 ≈ 0.167 < 0.2 → variadic
    const data = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob"   },
      { id: 3, name: "Carol" },
      { id: 4, name: "Dave"  },
      { id: 5, name: "Eve"   },
      { id: 6, name: "Frank", note: "vip" }
    ];

    test("variadic field absent → not emitted", () => {
      expect(serializeRow({ id: 1, name: "Alice" }, fields(data)))
        .toBe("- 1|Alice");
    });

    test("variadic field present → appended as key=value", () => {
      expect(serializeRow({ id: 6, name: "Frank", note: "vip" }, fields(data)))
        .toBe("- 6|Frank|note=vip");
    });

    test("multiple variadic extras", () => {
      // two variadic fields: note and tier
      const data2 = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob"   },
        { id: 3, name: "Carol" },
        { id: 4, name: "Dave"  },
        { id: 5, name: "Eve"   },
        { id: 6, name: "Frank", note: "vip", tier: "gold" }
      ];
      expect(serializeRow({ id: 6, name: "Frank", note: "vip", tier: "gold" }, fields(data2)))
        .toBe("- 6|Frank|note=vip|tier=gold");
    });

    test("variadic field null → not emitted", () => {
      expect(serializeRow({ id: 6, name: "Frank", note: null }, fields(data)))
        .toBe("- 6|Frank");
    });
  });

  // ── Value escaping ─────────────────────────────────────────────────────────

  describe("value escaping", () => {
    test("pipe in string value is escaped", () => {
      const data = [{ id: 1, name: "a|b" }, { id: 2, name: "c" }];
      expect(serializeRow({ id: 1, name: "a|b" }, fields(data)))
        .toBe("- 1|a\\|b");
    });

    test("tilde string is escaped", () => {
      const data = [{ id: 1, name: "~" }, { id: 2, name: "x" }];
      expect(serializeRow({ id: 1, name: "~" }, fields(data)))
        .toBe("- 1|\\~");
    });
  });

  // ── Module ─────────────────────────────────────────────────────────────────

  describe("module", () => {
    test("is a function", () => {
      expect(typeof serializeRow).toBe("function");
    });

    test("is frozen", () => {
      expect(Object.isFrozen(serializeRow)).toBe(true);
    });
  });

});
