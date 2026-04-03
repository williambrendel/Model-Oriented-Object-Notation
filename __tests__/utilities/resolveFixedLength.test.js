"use strict";

const resolveFixedLength =
  require("../../src/utilities/resolveFixedLength");

describe("resolveFixedLength", () => {

  // ── Fixed-length detection ─────────────────────────────────────────────

  describe("consistent array lengths", () => {

    test("returns shared length for identical arrays", () => {
      expect(
        resolveFixedLength([[1, 2], [3, 4]])
      ).toBe(2);
    });

    test("returns shared length for single array", () => {
      expect(
        resolveFixedLength([[1, 2, 3]])
      ).toBe(3);
    });

    test("returns 0 for consistently empty arrays", () => {
      expect(
        resolveFixedLength([[], []])
      ).toBe(0);
    });

  });

  // ── Variable-length detection ──────────────────────────────────────────

  describe("inconsistent array lengths", () => {

    test("returns null when lengths differ", () => {
      expect(
        resolveFixedLength([[1], [2, 3]])
      ).toBeNull();
    });

    test("returns null for multiple distinct lengths", () => {
      expect(
        resolveFixedLength([[1], [2, 3], [4, 5, 6]])
      ).toBeNull();
    });

  });

  // ── Non-array values ───────────────────────────────────────────────────

  describe("non-array values", () => {

    test("ignores null values", () => {
      expect(
        resolveFixedLength([[1, 2], null])
      ).toBe(2);
    });

    test("ignores undefined values", () => {
      expect(
        resolveFixedLength([[1, 2], undefined])
      ).toBe(2);
    });

    test("ignores primitive values", () => {
      expect(
        resolveFixedLength([[1, 2], 42, "x", true])
      ).toBe(2);
    });

    test("returns null when no arrays exist", () => {
      expect(
        resolveFixedLength([null, undefined, 42])
      ).toBeNull();
    });

  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  describe("edge cases", () => {

    test("returns null for empty input", () => {
      expect(
        resolveFixedLength([])
      ).toBeNull();
    });

    test("handles mixture of arrays and objects", () => {
      expect(
        resolveFixedLength([[1, 2], { a: 1 }])
      ).toBe(2);
    });

    test("handles nested arrays as elements", () => {
      expect(
        resolveFixedLength([[[1]], [[2]]])
      ).toBe(1);
    });

  });

});