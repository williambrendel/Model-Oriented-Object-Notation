"use strict";

const serializeInlineValue = require("../../src/core/serializeInlineValue");
const analyzeSchema        = require("../../src/core/analyzeSchema");

// ── Descriptor helpers ────────────────────────────────────────────────────────
// Build descriptors from real data via analyzeSchema.
// For field-level descriptors, extract the relevant field's descriptor.

const prim = () => ({ type: "primitive" });

const arrDesc = data => analyzeSchema(data);

const fieldDesc = (data, fieldName) => {
  const result = analyzeSchema(data);
  return result.fields.find(f => f.name === fieldName);
};

describe("serializeInlineValue", () => {

  // ── Null / absent ──────────────────────────────────────────────────────────

  describe("null and absent", () => {
    test("null with primitive descriptor → ~", () => {
      expect(serializeInlineValue(null, prim())).toBe("~");
    });

    test("undefined with primitive descriptor → ~", () => {
      expect(serializeInlineValue(undefined, prim())).toBe("~");
    });

    test("null with array descriptor → ~", () => {
      expect(serializeInlineValue(null, arrDesc([1, 2, 3]))).toBe("~");
    });

    test("null with object descriptor → ~", () => {
      const d = analyzeSchema({ id: 1, name: "Alice" });
      expect(serializeInlineValue(null, d)).toBe("~");
    });
  });

  // ── Primitives ─────────────────────────────────────────────────────────────

  describe("primitives", () => {
    test("number", () => {
      expect(serializeInlineValue(42, prim())).toBe("42");
    });

    test("string", () => {
      expect(serializeInlineValue("Alice", prim())).toBe("Alice");
    });

    test("boolean true", () => {
      expect(serializeInlineValue(true, prim())).toBe("true");
    });

    test("boolean false", () => {
      expect(serializeInlineValue(false, prim())).toBe("false");
    });

    test("string with pipe is escaped", () => {
      expect(serializeInlineValue("hello|world", prim())).toBe("hello\\|world");
    });

    test("tilde string is escaped", () => {
      expect(serializeInlineValue("~", prim())).toBe("\\~");
    });

    test("-0 is normalised to 0", () => {
      expect(serializeInlineValue(-0, prim())).toBe("0");
    });

    test("NaN → ~", () => {
      expect(serializeInlineValue(NaN, prim())).toBe("~");
    });
  });

  // ── 1D primitive arrays ────────────────────────────────────────────────────

  describe("1D primitive arrays", () => {
    test("numbers", () => {
      expect(serializeInlineValue([10, 20], arrDesc([10, 20]))).toBe("[10|20]");
    });

    test("strings", () => {
      expect(serializeInlineValue(["Alice", "Bob", "Carol"], arrDesc(["Alice", "Bob", "Carol"])))
        .toBe("[Alice|Bob|Carol]");
    });

    test("null element → ~", () => {
      const d = arrDesc([1, 2, 3]);
      expect(serializeInlineValue([1, null, 3], d)).toBe("[1|~|3]");
    });

    test("wrapped in square brackets", () => {
      const result = serializeInlineValue([1, 2], arrDesc([1, 2]));
      expect(result).toMatch(/^\[.+\]$/);
    });

    test("single element", () => {
      expect(serializeInlineValue([42], arrDesc([42]))).toBe("[42]");
    });

    test("strings with pipe are escaped", () => {
      const d = arrDesc(["hello|world", "foo"]);
      expect(serializeInlineValue(["hello|world", "foo"], d)).toBe("[hello\\|world|foo]");
    });
  });

  // ── 1D object arrays ───────────────────────────────────────────────────────

  describe("1D object arrays", () => {
    test("array of objects → [{v|v}|{v|v}]", () => {
      const data = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
      const d    = arrDesc(data);
      expect(serializeInlineValue(data, d)).toBe("[{1|Alice}|{2|Bob}]");
    });

    test("absent field in object omitted when variadic (n-aware)", () => {
      // n=2, name field appears in both records (f=1.0) → declared
      // id field appears in both records (f=1.0) → declared
      // Both fields in schema, no nulls to emit
      const data = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
      const d    = arrDesc(data);
      expect(serializeInlineValue([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }], d))
        .toBe("[{1|Alice}|{2|Bob}]");
    });

    test("null value in field counts as absent → variadic", () => {
      // n=2, name: appears in 2/2 records (f=1.0) → declared
      // null name means field is present but value is null → emits ~
      const data = [{ id: 1, name: "Alice" }, { id: 2, name: null }];
      const d    = arrDesc(data);
      // With n=2, name frequency = 2/2 = 1.0 → declared
      expect(serializeInlineValue([{ id: 1, name: "Alice" }, { id: 2, name: null }], d))
        .toBe("[{1|Alice}|{2|~}]");
    });
  });

  // ── Nested objects ─────────────────────────────────────────────────────────

  describe("nested objects", () => {
    test("pure object → {v1|v2}", () => {
      const data = [{ id: "P1", lead: { id: 1, name: "Alice" } }];
      const d    = fieldDesc(data, "lead");
      expect(serializeInlineValue({ id: 1, name: "Alice" }, d)).toBe("{1|Alice}");
    });

    test("absent field in nested object emits ~ when declared", () => {
      // n=2, name appears in 1/2 records (f=0.50), len=4
      // breakEven = (2+4-2)/(2×5) = 4/10 = 0.40
      // 0.50 < 0.40? NO → declared
      // Therefore missing name should emit ~
      const data = [
        { id: "P1", lead: { id: 1, name: "Alice" } },
        { id: "P2", lead: { id: 2 } }
      ];
      const d = fieldDesc(data, "lead");
      expect(serializeInlineValue({ id: 2 }, d)).toBe("{2|~}");
    });

    test("nested object with array sub-field: specs{performance[3]|weight}", () => {
      const data = [
        { id: "X1", specs: { performance: ["95%", "98%", "97%"], weight: "2.5kg" } },
        { id: "X2", specs: { performance: ["88%", "92%", "90%"], weight: "1.8kg" } }
      ];
      const d = fieldDesc(data, "specs");
      expect(serializeInlineValue({ performance: ["95%", "98%", "97%"], weight: "2.5kg" }, d))
        .toBe("{[95%|98%|97%]|2.5kg}");
    });
  });

  // ── 2D grids ───────────────────────────────────────────────────────────────

  describe("2D grids", () => {
    test("2D primitive grid → [[v|v]|[v|v]]", () => {
      const d = arrDesc([[1, 2], [3, 4]]);
      expect(serializeInlineValue([[1, 2], [3, 4]], d)).toBe("[[1|2]|[3|4]]");
    });

    test("2D grid with null → [[v|~]|[v|v]]", () => {
      const d = arrDesc([[1, 2], [3, 4]]);
      expect(serializeInlineValue([[1, null], [3, 4]], d)).toBe("[[1|~]|[3|4]]");
    });
  });

  // ── 3D grids ───────────────────────────────────────────────────────────────

  describe("3D grids", () => {
    test("3D grid → [[[v|v]|[v|v]]|[[v|v]|[v|v]]]", () => {
      const data = [[[1, 2], [3, 4]], [[5, 6], [7, 8]]];
      const d    = arrDesc(data);
      expect(serializeInlineValue(data, d)).toBe("[[[1|2]|[3|4]]|[[5|6]|[7|8]]]");
    });
  });

  // ── Module ─────────────────────────────────────────────────────────────────

  describe("module", () => {
    test("is a function", () => {
      expect(typeof serializeInlineValue).toBe("function");
    });

    test("is frozen", () => {
      expect(Object.isFrozen(serializeInlineValue)).toBe(true);
    });
  });

});