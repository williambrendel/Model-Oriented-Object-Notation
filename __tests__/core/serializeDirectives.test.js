"use strict";

const serializeDirectives = require("../../src/core/serializeDirectives");
const {
  NULL_MARKER,
  FIELD_SEPARATOR,
  ITEM_MARKER,
  EX_SCHEMA,
  EX_NESTED,
  EX_GRID,
  EX_INLINE,
  EX_VARIADIC,
} = require("../../src/constants");

describe("serializeDirectives", () => {

  // ── No directives ──────────────────────────────────────────────────────────

  describe("empty context", () => {
    test("emits empty string when context is empty", () => {
      expect(serializeDirectives({}, {})).toBe("");
    });

    test("emits empty string with no arguments", () => {
      expect(serializeDirectives()).toBe("");
    });
  });

  // ── Conditional token directives ───────────────────────────────────────────

  describe("conditional token directives", () => {
    test("@null emitted when hasNull", () => {
      expect(serializeDirectives({}, { hasNull: true })).toBe(`@null: ${NULL_MARKER}`);
    });

    test("@sep emitted when hasSep", () => {
      expect(serializeDirectives({}, { hasSep: true })).toBe(`@sep: ${FIELD_SEPARATOR}`);
    });

    test("@item emitted when hasItem", () => {
      expect(serializeDirectives({}, { hasItem: true })).toBe(`@item: ${ITEM_MARKER}`);
    });

    test("only flags that are true emit directives", () => {
      const result = serializeDirectives({}, { hasNull: true, hasItem: true });
      expect(result).toContain("@null");
      expect(result).toContain("@item");
      expect(result).not.toContain("@sep");
    });

    test("all three token directives emitted when all flags true", () => {
      const result = serializeDirectives({}, { hasNull: true, hasSep: true, hasItem: true });
      expect(result).toContain("@null");
      expect(result).toContain("@sep");
      expect(result).toContain("@item");
    });
  });

  // ── Custom token overrides ─────────────────────────────────────────────────

  describe("custom token overrides", () => {
    test("custom nullMarker", () => {
      expect(serializeDirectives({ nullMarker: "∅" }, { hasNull: true })).toBe("@null: ∅");
    });

    test("custom fieldSeparator", () => {
      expect(serializeDirectives({ fieldSeparator: "," }, { hasSep: true })).toBe("@sep: ,");
    });

    test("custom itemMarker", () => {
      expect(serializeDirectives({ itemMarker: "*" }, { hasItem: true })).toBe("@item: *");
    });
  });

  // ── @hint directive ────────────────────────────────────────────────────────

  describe("@hint directive", () => {
    test("not emitted by default", () => {
      expect(serializeDirectives()).not.toContain("@hint");
    });

    test("emitted when hintPrefix is set", () => {
      expect(serializeDirectives({ hintPrefix: "#" })).toContain("@hint: #");
    });

    test("emitted even when context is empty", () => {
      expect(serializeDirectives({ hintPrefix: "#" }, {})).toBe("@hint: #");
    });
  });

  // ── addDefinitions: false ─────────────────────────────────────────────────

  describe("addDefinitions: false", () => {
    test("suppresses all token directives", () => {
      const result = serializeDirectives(
        { addDefinitions: false },
        { hasNull: true, hasSep: true, hasItem: true }
      );
      expect(result).not.toContain("@null");
      expect(result).not.toContain("@sep");
      expect(result).not.toContain("@item");
    });

    test("still emits example directives when context has flags", () => {
      const result = serializeDirectives(
        { addDefinitions: false },
        { hasSchema: true }
      );
      expect(result).toContain("@ex_schema");
    });
  });

  // ── Example directives ─────────────────────────────────────────────────────

  describe("example directives", () => {
    test("no example directives emitted when context is empty", () => {
      expect(serializeDirectives({}, {})).not.toContain("@ex_");
    });

    test("@ex_schema emitted when hasSchema", () => {
      expect(serializeDirectives({}, { hasSchema: true })).toContain(`@ex_schema: ${EX_SCHEMA}`);
    });

    test("@ex_nested emitted when hasNested", () => {
      expect(serializeDirectives({}, { hasNested: true })).toContain(`@ex_nested: ${EX_NESTED}`);
    });

    test("@ex_grid emitted when hasGrid", () => {
      expect(serializeDirectives({}, { hasGrid: true })).toContain(`@ex_grid: ${EX_GRID}`);
    });

    test("@ex_inline emitted when hasInline", () => {
      expect(serializeDirectives({}, { hasInline: true })).toContain(`@ex_inline: ${EX_INLINE}`);
    });

    test("@ex_variadic emitted when hasVariadic", () => {
      expect(serializeDirectives({}, { hasVariadic: true })).toContain(`@ex_variadic: ${EX_VARIADIC}`);
    });

    test("addSchemaExamples: false suppresses all example directives", () => {
      const result = serializeDirectives(
        { addSchemaExamples: false },
        { hasSchema: true, hasGrid: true }
      );
      expect(result).not.toContain("@ex_");
    });
  });

  // ── Ordering ───────────────────────────────────────────────────────────────

  describe("ordering", () => {
    test("token directives appear before example directives", () => {
      const lines     = serializeDirectives({}, { hasNull: true, hasSchema: true }).split("\n");
      const nullIdx   = lines.findIndex(l => l.startsWith("@null"));
      const schemaIdx = lines.findIndex(l => l.startsWith("@ex_schema"));
      expect(nullIdx).toBeLessThan(schemaIdx);
    });

    test("no trailing newline", () => {
      expect(serializeDirectives({}, { hasNull: true }).endsWith("\n")).toBe(false);
    });
  });

  // ── Module ─────────────────────────────────────────────────────────────────

  describe("module", () => {
    test("is a function", () => {
      expect(typeof serializeDirectives).toBe("function");
    });

    test("is frozen", () => {
      expect(Object.isFrozen(serializeDirectives)).toBe(true);
    });
  });

});