"use strict";

const serializeValue = require("../../src/core/serializeValue");

describe("serializeValue", () => {

  // ── Null / absent ──────────────────────────────────────────────────────────

  describe("null and absent values", () => {
    test("serializes null to ~", () => {
      expect(serializeValue(null)).toBe("~");
    });

    test("serializes undefined to ~", () => {
      expect(serializeValue(undefined)).toBe("~");
    });
  });

  // ── Booleans ───────────────────────────────────────────────────────────────

  describe("booleans", () => {
    test("serializes true to 'true'", () => {
      expect(serializeValue(true)).toBe("true");
    });

    test("serializes false to 'false'", () => {
      expect(serializeValue(false)).toBe("false");
    });
  });

  // ── Numbers ────────────────────────────────────────────────────────────────

  describe("numbers", () => {
    test("serializes zero", () => {
      expect(serializeValue(0)).toBe("0");
    });

    test("normalizes -0 to 0", () => {
      expect(serializeValue(-0)).toBe("0");
    });

    test("serializes positive integer", () => {
      expect(serializeValue(42)).toBe("42");
    });

    test("serializes negative integer", () => {
      expect(serializeValue(-7)).toBe("-7");
    });

    test("serializes float", () => {
      expect(serializeValue(3.14)).toBe("3.14");
    });

    test("serializes negative float", () => {
      expect(serializeValue(-1.5)).toBe("-1.5");
    });

    test("serializes NaN to ~", () => {
      expect(serializeValue(NaN)).toBe("~");
    });

    test("serializes Infinity to ~", () => {
      expect(serializeValue(Infinity)).toBe("~");
    });

    test("serializes -Infinity to ~", () => {
      expect(serializeValue(-Infinity)).toBe("~");
    });

    test("converts exponent notation to plain decimal", () => {
      expect(serializeValue(1e21)).toBe("1000000000000000000000");
    });

    test("converts small exponent notation to plain decimal", () => {
      expect(serializeValue(1e-7)).toBe("0.0000001");
    });

    test("serializes large safe integer", () => {
      expect(serializeValue(Number.MAX_SAFE_INTEGER)).toBe("9007199254740991");
    });
  });

  // ── Strings ────────────────────────────────────────────────────────────────

  describe("strings", () => {
    test("serializes plain string unchanged", () => {
      expect(serializeValue("Alice")).toBe("Alice");
    });

    test("serializes empty string unchanged", () => {
      expect(serializeValue("")).toBe("");
    });

    test("escapes pipe in string", () => {
      expect(serializeValue("a|b")).toBe("a\\|b");
    });

    test("escapes newline in string", () => {
      expect(serializeValue("line1\nline2")).toBe("line1\\nline2");
    });

    test("escapes backslash in string", () => {
      expect(serializeValue("C:\\path")).toBe("C:\\\\path");
    });

    test("escapes tilde — literal tilde must not be confused with null token", () => {
      expect(serializeValue("~")).toBe("\\~");
    });

    test("serializes numeric-looking string unchanged (no coercion)", () => {
      expect(serializeValue("42")).toBe("42");
    });

    test("serializes boolean-looking string unchanged", () => {
      expect(serializeValue("true")).toBe("true");
    });

    test("handles Unicode characters", () => {
      expect(serializeValue("café")).toBe("café");
    });

    test("handles emoji", () => {
      expect(serializeValue("hello 👋")).toBe("hello 👋");
    });
  });

  // ── Unsupported types ──────────────────────────────────────────────────────

  describe("unsupported types", () => {
    test("throws TypeError for plain object", () => {
      expect(() => serializeValue({ id: 1 })).toThrow(TypeError);
    });

    test("throws TypeError for array", () => {
      expect(() => serializeValue([1, 2, 3])).toThrow(TypeError);
    });

    test("throws TypeError for symbol", () => {
      expect(() => serializeValue(Symbol("x"))).toThrow(TypeError);
    });

    test("error message includes the type", () => {
      expect(() => serializeValue({ id: 1 })).toThrow(/object/);
    });
  });

});