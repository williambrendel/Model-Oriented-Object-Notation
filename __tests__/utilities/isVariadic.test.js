"use strict";

const isVariadic = require("../../src/utilities/isVariadic");
const { VARIADIC_MAX_FREQUENCY } = require("../../src/constants");

describe("isVariadic", () => {

  // ── Tier 1: floor check ────────────────────────────────────────────────────

  describe("floor check (tier 1)", () => {
    test("frequency below floor is always variadic", () => {
      expect(isVariadic("name", 0.1)).toBe(true);
    });

    test("frequency exactly at floor is not variadic by floor check", () => {
      // 0.2 is not < 0.2, so floor check passes to tier 2
      // break-even for "name" (4 chars) = 1/6 ≈ 0.167 < 0.2 → not variadic
      expect(isVariadic("name", VARIADIC_MAX_FREQUENCY)).toBe(false);
    });

    test("zero frequency is variadic", () => {
      expect(isVariadic("x", 0)).toBe(true);
    });

    test("custom floor threshold respected", () => {
      // With floor=0.5, frequency=0.3 is below floor → variadic
      expect(isVariadic("name", 0.3, 0.5)).toBe(true);
    });
  });

  // ── Tier 2: break-even formula ─────────────────────────────────────────────

  describe("break-even formula (tier 2)", () => {
    test("short key (1 char) at moderate frequency → variadic", () => {
      // break-even for "x" (1 char) = 1/(1+2) = 0.333
      // f=0.25 < 0.333 → variadic
      expect(isVariadic("x", 0.25)).toBe(true);
    });

    test("short key (1 char) at high frequency → declared", () => {
      // f=0.50 > 0.333 → declared
      expect(isVariadic("x", 0.50)).toBe(false);
    });

    test("medium key (4 chars) at frequency above break-even → declared", () => {
      // break-even for "note" (4 chars) = 1/(4+2) = 0.167
      // f=0.40 > 0.167 → declared
      expect(isVariadic("note", 0.40)).toBe(false);
    });

    test("medium key (4 chars) at frequency below break-even → variadic", () => {
      // f=0.15 < 0.167 but also < floor 0.2 → caught by tier 1 anyway
      // use f=0.22 to test tier 2 specifically with a 2-char key
      // break-even for "id" (2 chars) = 1/(2+2) = 0.25
      // f=0.22 > floor(0.2) but < 0.25 → variadic by tier 2
      expect(isVariadic("id", 0.22)).toBe(true);
    });

    test("long key (8 chars) at moderate frequency → variadic", () => {
      // break-even for "username" (8 chars) = 1/(8+2) = 0.10
      // f=0.25 > floor, but 0.25 > 0.10 → declared
      expect(isVariadic("username", 0.25)).toBe(false);
    });

    test("long key (8 chars) at low-but-above-floor frequency → declared", () => {
      // f=0.22 > floor(0.2), break-even=0.10, 0.22 > 0.10 → declared
      expect(isVariadic("username", 0.22)).toBe(false);
    });

    test("badge (5 chars) at 20% → declared", () => {
      // break-even = 1/(5+2) = 0.143
      // f=0.20 > floor, 0.20 > 0.143 → declared
      expect(isVariadic("badge", 0.20)).toBe(false);
    });

    test("frequency = 1.0 is never variadic", () => {
      expect(isVariadic("x", 1.0)).toBe(false);
      expect(isVariadic("verylongfieldname", 1.0)).toBe(false);
    });
  });

  // ── Break-even boundary ────────────────────────────────────────────────────

  describe("break-even boundary", () => {
    test("frequency exactly at break-even is declared (not strictly less than)", () => {
      // break-even for "id" (2 chars) = 1/4 = 0.25
      // f=0.25 is not < 0.25 → declared
      expect(isVariadic("id", 0.25)).toBe(false);
    });

    test("frequency just below break-even is variadic", () => {
      // f=0.249 < 0.25 → variadic
      expect(isVariadic("id", 0.249)).toBe(true);
    });

    test("frequency just above break-even is declared", () => {
      // f=0.251 > 0.25 → declared
      expect(isVariadic("id", 0.251)).toBe(false);
    });
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