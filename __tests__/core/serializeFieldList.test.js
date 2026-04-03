"use strict";

const serializeFieldList = require("../../src/core/serializeFieldList");

// ── Field helpers ─────────────────────────────────────────────────────────────
// Fields are descriptors — type and all properties live directly on the field.

const prim = (name, variadic = false) =>
  ({ name, variadic, type: "primitive" });

const obj = (name, fields, variadic = false) =>
  ({ name, variadic, type: "object", fields });

const arr = (name, dimensions, elementType = "primitive", fields = [], variadic = false) =>
  ({ name, variadic, type: "array", dimensions, elementType, fields });

describe("serializeFieldList", () => {

  // ── Basic field lists ──────────────────────────────────────────────────────

  describe("basic field serialization", () => {
    test("serializes simple primitive fields", () => {
      const fields = [prim("id"), prim("name"), prim("role")];
      expect(serializeFieldList(fields)).toBe("id|name|role");
    });

    test("preserves field order", () => {
      const fields = [prim("z"), prim("a")];
      expect(serializeFieldList(fields)).toBe("z|a");
    });

    test("single field", () => {
      expect(serializeFieldList([prim("id")])).toBe("id");
    });

    test("empty fields returns empty string", () => {
      expect(serializeFieldList([])).toBe("");
    });
  });

  // ── Variadic behavior ──────────────────────────────────────────────────────

  describe("variadic fields", () => {
    test("omits variadic fields from output", () => {
      const fields = [prim("id"), prim("debug", true)];
      expect(serializeFieldList(fields)).toBe("id|...");
    });

    test("appends ellipsis when any field is variadic", () => {
      const fields = [prim("id"), prim("note", true)];
      expect(serializeFieldList(fields)).toBe("id|...");
    });

    test("does not append ellipsis when no fields are variadic", () => {
      const fields = [prim("id"), prim("name")];
      expect(serializeFieldList(fields)).toBe("id|name");
    });

    test("returns only ellipsis when all fields are variadic", () => {
      const fields = [prim("debug", true)];
      expect(serializeFieldList(fields)).toBe("...");
    });

    test("multiple variadic fields still emit only one ellipsis", () => {
      const fields = [prim("id"), prim("a", true), prim("b", true)];
      expect(serializeFieldList(fields)).toBe("id|...");
    });
  });

  // ── Nested object fields ───────────────────────────────────────────────────

  describe("nested object fields", () => {
    test("serializes nested object field", () => {
      const fields = [
        obj("lead", [prim("id"), prim("name")])
      ];
      expect(serializeFieldList(fields)).toBe("lead{id|name}");
    });

    test("serializes nested object with variadic field", () => {
      const fields = [
        obj("lead", [prim("id"), prim("debug", true)])
      ];
      expect(serializeFieldList(fields)).toBe("lead{id|...}");
    });

    test("serializes nested object alongside primitive fields", () => {
      const fields = [prim("id"), obj("lead", [prim("id"), prim("name")])];
      expect(serializeFieldList(fields)).toBe("id|lead{id|name}");
    });
  });

  // ── Array fields ───────────────────────────────────────────────────────────

  describe("array fields", () => {
    test("serializes fixed-size primitive array", () => {
      const fields = [arr("members", [3])];
      expect(serializeFieldList(fields)).toBe("members[3]");
    });

    test("serializes variable-size primitive array", () => {
      const fields = [arr("members", [null])];
      expect(serializeFieldList(fields)).toBe("members[]");
    });

    test("serializes multidimensional array", () => {
      const fields = [arr("grid", [2, 3])];
      expect(serializeFieldList(fields)).toBe("grid[2][3]");
    });

    test("serializes array alongside primitive fields", () => {
      const fields = [prim("name"), arr("scores", [5])];
      expect(serializeFieldList(fields)).toBe("name|scores[5]");
    });
  });

  // ── Array of objects ───────────────────────────────────────────────────────

  describe("array of objects", () => {
    test("serializes array of objects with fields", () => {
      const fields = [
        arr("items", [null], "object", [prim("id"), prim("title")])
      ];
      expect(serializeFieldList(fields)).toBe("items[]{id|title}");
    });

    test("serializes fixed-length array of objects", () => {
      const fields = [
        arr("tasks", [2], "object", [prim("id")])
      ];
      expect(serializeFieldList(fields)).toBe("tasks[2]{id}");
    });
  });

  // ── Deep nesting ───────────────────────────────────────────────────────────

  describe("deep nesting", () => {
    test("serializes nested object containing array of objects", () => {
      const fields = [
        obj("project", [
          arr("tasks", [2], "object", [prim("id")])
        ])
      ];
      expect(serializeFieldList(fields)).toBe("project{tasks[2]{id}}");
    });

    test("serializes nested object with array sub-field", () => {
      const fields = [
        obj("specs", [
          arr("performance", [3]),
          prim("weight")
        ])
      ];
      expect(serializeFieldList(fields)).toBe("specs{performance[3]|weight}");
    });
  });

  // ── Module ─────────────────────────────────────────────────────────────────

  describe("module", () => {
    test("is a function", () => {
      expect(typeof serializeFieldList).toBe("function");
    });

    test("is frozen", () => {
      expect(Object.isFrozen(serializeFieldList)).toBe(true);
    });
  });

});