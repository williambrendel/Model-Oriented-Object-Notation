"use strict";

const typeOf = require("../../src/utilities/typeOf");

describe("typeOf", () => {

  // ── Null / absent values ────────────────────────────────────────────────

  describe("null and undefined", () => {

    test("classifies null as 'null'", () => {
      expect(typeOf(null)).toBe("null");
    });

    test("classifies undefined as 'null'", () => {
      expect(typeOf(undefined)).toBe("null");
    });

  });

  // ── Arrays ──────────────────────────────────────────────────────────────

  describe("arrays", () => {

    test("classifies empty array", () => {
      expect(typeOf([])).toBe("array");
    });

    test("classifies populated array", () => {
      expect(typeOf([1, 2, 3])).toBe("array");
    });

    test("classifies nested array", () => {
      expect(typeOf([[1], [2]])).toBe("array");
    });

  });

  // ── Objects ─────────────────────────────────────────────────────────────

  describe("objects", () => {

    test("classifies plain object", () => {
      expect(typeOf({})).toBe("object");
    });

    test("classifies object with properties", () => {
      expect(typeOf({ id: 1 })).toBe("object");
    });

    test("classifies Date object", () => {
      expect(typeOf(new Date())).toBe("object");
    });

    test("classifies RegExp object", () => {
      expect(typeOf(/abc/)).toBe("object");
    });

  });

  // ── Primitives ──────────────────────────────────────────────────────────

  describe("primitive values", () => {

    test("classifies string", () => {
      expect(typeOf("Alice")).toBe("primitive");
    });

    test("classifies number", () => {
      expect(typeOf(42)).toBe("primitive");
    });

    test("classifies boolean", () => {
      expect(typeOf(true)).toBe("primitive");
    });

    test("classifies bigint", () => {
      expect(typeOf(10n)).toBe("primitive");
    });

    test("classifies symbol", () => {
      expect(typeOf(Symbol("x"))).toBe("primitive");
    });

  });

  // ── Edge cases ──────────────────────────────────────────────────────────

  describe("edge cases", () => {

    test("array detection takes precedence over object", () => {
      const value = [];
      expect(typeof value).toBe("object"); // JS behavior
      expect(typeOf(value)).toBe("array"); // MOON behavior
    });

    test("function is treated as primitive", () => {
      const fn = () => {};
      expect(typeOf(fn)).toBe("primitive");
    });

  });

});