"use strict";

const constants = require("../src/constants");

const {
  NULL_MARKER,
  FIELD_SEPARATOR,
  ITEM_MARKER,
  INDENT,
  VARIADIC_MAX_FREQUENCY,
  DIRECTIVE_PREFIX,
  DIRECTIVE_NULL,
  DIRECTIVE_SEP,
  DIRECTIVE_ITEM,
  DIRECTIVE_HINT,
  DIRECTIVE_EX_SCHEMA,
  DIRECTIVE_EX_NESTED,
  DIRECTIVE_EX_GRID,
  DIRECTIVE_EX_INLINE,
  DIRECTIVE_EX_VARIADIC,
  EX_SCHEMA,
  EX_NESTED,
  EX_GRID,
  EX_INLINE,
  EX_VARIADIC,
} = constants;

describe("constants", () => {

  describe("NULL_MARKER", () => {
    test("is a string", () => expect(typeof NULL_MARKER).toBe("string"));
    test("is tilde", () => expect(NULL_MARKER).toBe("~"));
    test("has length 1", () => expect(NULL_MARKER).toHaveLength(1));
  });

  describe("FIELD_SEPARATOR", () => {
    test("is a string", () => expect(typeof FIELD_SEPARATOR).toBe("string"));
    test("is pipe", () => expect(FIELD_SEPARATOR).toBe("|"));
    test("has length 1", () => expect(FIELD_SEPARATOR).toHaveLength(1));
  });

  describe("ITEM_MARKER", () => {
    test("is a string", () => expect(typeof ITEM_MARKER).toBe("string"));
    test("is dash", () => expect(ITEM_MARKER).toBe("-"));
    test("has length 1", () => expect(ITEM_MARKER).toHaveLength(1));
  });

  describe("INDENT", () => {
    test("is a string", () => expect(typeof INDENT).toBe("string"));
    test("is one space", () => expect(INDENT).toBe(" "));
    test("has length 1", () => expect(INDENT).toHaveLength(1));
  });

  describe("VARIADIC_MAX_FREQUENCY", () => {
    test("is a number", () => expect(typeof VARIADIC_MAX_FREQUENCY).toBe("number"));
    test("is 0.2", () => expect(VARIADIC_MAX_FREQUENCY).toBe(0.2));
    test("is between 0 and 1 exclusive", () => {
      expect(VARIADIC_MAX_FREQUENCY).toBeGreaterThan(0);
      expect(VARIADIC_MAX_FREQUENCY).toBeLessThan(1);
    });
  });

  describe("DIRECTIVE_PREFIX", () => {
    test("is a string", () => expect(typeof DIRECTIVE_PREFIX).toBe("string"));
    test("is @", () => expect(DIRECTIVE_PREFIX).toBe("@"));
    test("has length 1", () => expect(DIRECTIVE_PREFIX).toHaveLength(1));
  });

  describe("DIRECTIVE_NULL", () => {
    test("is a string", () => expect(typeof DIRECTIVE_NULL).toBe("string"));
    test("is 'null'", () => expect(DIRECTIVE_NULL).toBe("null"));
  });

  describe("DIRECTIVE_SEP", () => {
    test("is a string", () => expect(typeof DIRECTIVE_SEP).toBe("string"));
    test("is 'sep'", () => expect(DIRECTIVE_SEP).toBe("sep"));
  });

  describe("DIRECTIVE_ITEM", () => {
    test("is a string", () => expect(typeof DIRECTIVE_ITEM).toBe("string"));
    test("is 'item'", () => expect(DIRECTIVE_ITEM).toBe("item"));
  });

  describe("DIRECTIVE_HINT", () => {
    test("is a string", () => expect(typeof DIRECTIVE_HINT).toBe("string"));
    test("is 'hint'", () => expect(DIRECTIVE_HINT).toBe("hint"));
  });

  describe("DIRECTIVE_EX_SCHEMA", () => {
    test("is a string", () => expect(typeof DIRECTIVE_EX_SCHEMA).toBe("string"));
    test("is 'ex_schema'", () => expect(DIRECTIVE_EX_SCHEMA).toBe("ex_schema"));
  });

  describe("DIRECTIVE_EX_NESTED", () => {
    test("is a string", () => expect(typeof DIRECTIVE_EX_NESTED).toBe("string"));
    test("is 'ex_nested'", () => expect(DIRECTIVE_EX_NESTED).toBe("ex_nested"));
  });

  describe("DIRECTIVE_EX_GRID", () => {
    test("is a string", () => expect(typeof DIRECTIVE_EX_GRID).toBe("string"));
    test("is 'ex_grid'", () => expect(DIRECTIVE_EX_GRID).toBe("ex_grid"));
  });

  describe("DIRECTIVE_EX_INLINE", () => {
    test("is a string", () => expect(typeof DIRECTIVE_EX_INLINE).toBe("string"));
    test("is 'ex_inline'", () => expect(DIRECTIVE_EX_INLINE).toBe("ex_inline"));
  });

  describe("DIRECTIVE_EX_VARIADIC", () => {
    test("is a string", () => expect(typeof DIRECTIVE_EX_VARIADIC).toBe("string"));
    test("is 'ex_variadic'", () => expect(DIRECTIVE_EX_VARIADIC).toBe("ex_variadic"));
  });

  describe("EX_SCHEMA", () => {
    test("is a string", () => expect(typeof EX_SCHEMA).toBe("string"));
    test("contains schema and row", () => {
      expect(EX_SCHEMA).toContain("{");
      expect(EX_SCHEMA).toContain("-");
    });
  });

  describe("EX_NESTED", () => {
    test("is a string", () => expect(typeof EX_NESTED).toBe("string"));
    test("contains nested object and array syntax", () => {
      expect(EX_NESTED).toContain("{");
      expect(EX_NESTED).toContain("[");
    });
  });

  describe("EX_GRID", () => {
    test("is a string", () => expect(typeof EX_GRID).toBe("string"));
    test("contains two dimension annotations", () => {
      expect(EX_GRID).toMatch(/\[\d+\]\[\d+\]/);
    });
  });

  describe("EX_INLINE", () => {
    test("is a string", () => expect(typeof EX_INLINE).toBe("string"));
    test("contains array and object inline patterns", () => {
      expect(EX_INLINE).toContain("[");
      expect(EX_INLINE).toContain("=");
    });
  });

  describe("EX_VARIADIC", () => {
    test("is a string", () => expect(typeof EX_VARIADIC).toBe("string"));
    test("contains variadic marker", () => {
      expect(EX_VARIADIC).toContain("...");
    });
  });

  describe("module", () => {
    test("is frozen", () => {
      expect(Object.isFrozen(constants)).toBe(true);
    });

    test("exports exactly the expected keys", () => {
      expect(Object.keys(constants)).toEqual([
        "NULL_MARKER",
        "FIELD_SEPARATOR",
        "ITEM_MARKER",
        "HINT_PREFIX",
        "INDENT",
        "VARIADIC_MAX_FREQUENCY",
        "COMPRESSION_HIGH",
        "COMPRESSION_MEDIUM",
        "COMPRESSION_LOW",
        "DEFAULT_COMPRESSION",
        "ADD_HINTS",
        "ADD_DEFINITIONS",
        "ADD_SCHEMA_EXAMPLES",
        "DIRECTIVE_PREFIX",
        "DIRECTIVE_NULL",
        "DIRECTIVE_SEP",
        "DIRECTIVE_ITEM",
        "DIRECTIVE_HINT",
        "DIRECTIVE_EX_SCHEMA",
        "DIRECTIVE_EX_NESTED",
        "DIRECTIVE_EX_GRID",
        "DIRECTIVE_EX_INLINE",
        "DIRECTIVE_EX_VARIADIC",
        "EX_SCHEMA",
        "EX_NESTED",
        "EX_GRID",
        "EX_INLINE",
        "EX_VARIADIC",
      ]);
    });
  });

  describe("compression constants", () => {
    test("COMPRESSION_HIGH is 'high'",   () => expect(constants.COMPRESSION_HIGH).toBe("high"));
    test("COMPRESSION_MEDIUM is 'medium'", () => expect(constants.COMPRESSION_MEDIUM).toBe("medium"));
    test("COMPRESSION_LOW is 'low'",     () => expect(constants.COMPRESSION_LOW).toBe("low"));
    test("DEFAULT_COMPRESSION is high",  () => expect(constants.DEFAULT_COMPRESSION).toBe(constants.COMPRESSION_HIGH));
  });

  describe("default option constants", () => {
    test("ADD_HINTS is true",           () => expect(constants.ADD_HINTS).toBe(true));
    test("ADD_DEFINITIONS is true",     () => expect(constants.ADD_DEFINITIONS).toBe(true));
    test("ADD_SCHEMA_EXAMPLES is true", () => expect(constants.ADD_SCHEMA_EXAMPLES).toBe(true));
  });

});