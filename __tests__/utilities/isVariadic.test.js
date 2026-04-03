"use strict";

const isVariadic = require("../../src/utilities/isVariadic");
const { VARIADIC_MAX_FREQUENCY } = require("../../src/constants");

describe("isVariadic", () => {

  // ── Tier 1: floor check ────────────────────────────────────────────────────

  describe("floor check (tier 1)", () => {
    test("frequency below floor is always variadic", () => {
      expect(isVariadic("name", 0.1)).toBe(true);
    });

    test("frequency exactly at floor passes to tier 2", () => {
      // 0.2 is not < 0.2 → tier 2
      // break-even for "name" (4 chars, n=Infinity) = 1/5 = 0.20
      // f=0.20 is not < 0.20 → declared
      expect(isVariadic("name", VARIADIC_MAX_FREQUENCY)).toBe(false);
    });

    test("zero frequency is variadic", () => {
      expect(isVariadic("x", 0)).toBe(true);
    });

    test("custom floor threshold respected", () => {
      // With floor=0.5, frequency=0.3 is below floor → variadic
      expect(isVariadic("name", 0.3, Infinity, 0.5)).toBe(true);
    });
  });

  // ── Tier 2: break-even formula (large n / Infinity) ───────────────────────

  describe("break-even formula — large n asymptote", () => {
    test("short key (1 char) at moderate frequency → variadic", () => {
      // break-even for "x" (1 char, n=∞) = 1/(1+1) = 0.50
      // f=0.25 < 0.50 → variadic
      expect(isVariadic("x", 0.25)).toBe(true);
    });

    test("short key (1 char) at high frequency → declared", () => {
      // f=0.60 > 0.50 → declared
      expect(isVariadic("x", 0.60)).toBe(false);
    });

    test("medium key (4 chars) at frequency above break-even → declared", () => {
      // break-even for "note" (4 chars, n=∞) = 1/5 = 0.20
      // f=0.40 > 0.20 → declared
      expect(isVariadic("note", 0.40)).toBe(false);
    });

    test("medium key (4 chars) at frequency below break-even → variadic (via floor)", () => {
      // f=0.15 < floor 0.2 → caught by tier 1
      expect(isVariadic("note", 0.15)).toBe(true);
    });

    test("2-char key above floor but below break-even → variadic", () => {
      // break-even for "id" (2 chars, n=∞) = 1/3 ≈ 0.333
      // f=0.25 > floor(0.2) but < 0.333 → variadic by tier 2
      expect(isVariadic("id", 0.25)).toBe(true);
    });

    test("long key (8 chars) at moderate frequency → declared", () => {
      // break-even for "username" (8 chars, n=∞) = 1/9 ≈ 0.111
      // f=0.25 > floor, 0.25 > 0.111 → declared
      expect(isVariadic("username", 0.25)).toBe(false);
    });

    test("long key (8 chars) at low-but-above-floor frequency → declared", () => {
      // f=0.22 > floor(0.2), break-even=0.111, 0.22 > 0.111 → declared
      expect(isVariadic("username", 0.22)).toBe(false);
    });

    test("badge (5 chars) at 20% (n=∞) → declared", () => {
      // break-even = 1/(5+1) ≈ 0.167
      // f=0.20 > 0.167 → declared
      expect(isVariadic("badge", 0.20)).toBe(false);
    });

    test("frequency = 1.0 is never variadic", () => {
      expect(isVariadic("x", 1.0)).toBe(false);
      expect(isVariadic("verylongfieldname", 1.0)).toBe(false);
    });
  });

  // ── Break-even boundary (large n) ─────────────────────────────────────────

  describe("break-even boundary — large n", () => {
    test("frequency exactly at break-even is declared", () => {
      // break-even for "id" (2 chars, n=∞) = 1/3 ≈ 0.333
      expect(isVariadic("id", 1/3)).toBe(false);
    });

    test("frequency just below break-even is variadic", () => {
      expect(isVariadic("id", 0.332)).toBe(true);
    });

    test("frequency just above break-even is declared", () => {
      expect(isVariadic("id", 0.334)).toBe(false);
    });
  });

  // ── Tier 2: n-aware formula ────────────────────────────────────────────────

  describe("break-even formula — n-aware (small n)", () => {
    test("badge (5 chars) at f=0.20, n=5 → variadic", () => {
      // breakEven = (5+5+1)/(5×6) = 11/30 ≈ 0.367 > 0.20 → variadic
      expect(isVariadic("badge", 0.20, 5)).toBe(true);
    });

    test("note (4 chars) at f=0.40, n=5 → declared (exactly at break-even)", () => {
      // breakEven = (5+4+1)/(5×5) = 10/25 = 0.40
      expect(isVariadic("note", 0.40, 5)).toBe(false);
    });

    test("role (4 chars) at f=1.0, n=5 → declared", () => {
      expect(isVariadic("role", 1.0, 5)).toBe(false);
    });

    test("short key at high frequency → declared", () => {
      // x (1 char, n=5): breakEven = (5+1+1)/(5×2) = 7/10 = 0.70
      // f=0.80 > 0.70 → declared
      expect(isVariadic("x", 0.80, 5)).toBe(false);
    });

    test("short key at moderate frequency → variadic", () => {
      // x (1 char, n=5): breakEven = 0.70
      // f=0.50 < 0.70 → variadic
      expect(isVariadic("x", 0.30, 5)).toBe(true);
    });

    test("large n converges toward 1/(keyLength+1)", () => {
      // note (4 chars): asymptote = 1/5 = 0.20
      // at n=10000, breakEven ≈ 0.20 + tiny correction
      expect(isVariadic("note", 0.19, 10000)).toBe(true);  // below floor
      expect(isVariadic("note", 0.21, 10000)).toBe(false); // above asymptote
    });

    test("n=0 is guarded — treated as n=1", () => {
      expect(() => isVariadic("x", 0.5, 0)).not.toThrow();
    });
  });

  // ── Real example: variadics dataset (n=5) ─────────────────────────────────

  describe("real example: variadics dataset (n=5)", () => {
    // 5 records: id/name/role always present (f=1.0)
    // note appears 2x (f=0.40), badge appears 1x (f=0.20)
    test("id declared",    () => expect(isVariadic("id",    1.0,  5)).toBe(false));
    test("name declared",  () => expect(isVariadic("name",  1.0,  5)).toBe(false));
    test("role declared",  () => expect(isVariadic("role",  1.0,  5)).toBe(false));
    test("note declared",  () => expect(isVariadic("note",  0.40, 5)).toBe(false));
    test("badge variadic", () => expect(isVariadic("badge", 0.20, 5)).toBe(true));
  });

  // ── Module ─────────────────────────────────────────────────────────────────

  describe("module", () => {
    test("is a function", () => {
      expect(typeof isVariadic).toBe("function");
    });

    test("is frozen", () => {
      expect(Object.isFrozen(isVariadic)).toBe(true);
    });
  });

});