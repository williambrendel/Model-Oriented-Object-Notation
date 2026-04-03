"use strict";

const isPureObject = require("../../src/utilities/isPureObject");

describe("isPureObject", () => {

  // ── Pure objects ──────────────────────────────────────────────────────

  describe("primitive-only objects", () => {

    test("returns true for string, number, boolean values", () => {
      expect(
        isPureObject({
          id: 1,
          name: "Alice",
          active: true
        })
      ).toBe(true);
    });

    test("returns true for null and undefined values", () => {
      expect(
        isPureObject({
          a: null,
          b: undefined
        })
      ).toBe(true);
    });

    test("returns true for mixed primitive types", () => {
      expect(
        isPureObject({
          a: 1,
          b: "x",
          c: false,
          d: null
        })
      ).toBe(true);
    });

    test("returns true for empty object", () => {
      expect(
        isPureObject({})
      ).toBe(true);
    });

  });

  // ── Impure objects ─────────────────────────────────────────────────────

  describe("nested structures", () => {

    test("returns false when value is an object", () => {
      expect(
        isPureObject({
          profile: { age: 30 }
        })
      ).toBe(false);
    });

    test("returns false when value is an array", () => {
      expect(
        isPureObject({
          tags: ["a", "b"]
        })
      ).toBe(false);
    });

    test("returns false when multiple nested structures exist", () => {
      expect(
        isPureObject({
          a: {},
          b: []
        })
      ).toBe(false);
    });

  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  describe("edge cases", () => {

    test("returns false when value is a function", () => {
      expect(
        isPureObject({
          fn: () => {}
        })
      ).toBe(false);
    });

    test("returns false when value is Date object", () => {
      expect(
        isPureObject({
          created: new Date()
        })
      ).toBe(false);
    });

    test("returns false when value is Map", () => {
      expect(
        isPureObject({
          data: new Map()
        })
      ).toBe(false);
    });

    test("returns false when value is nested null object wrapper", () => {
      expect(
        isPureObject({
          x: Object.create(null)
        })
      ).toBe(false);
    });

  });

});