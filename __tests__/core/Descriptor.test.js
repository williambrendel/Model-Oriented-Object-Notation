"use strict";

const Descriptor = require("../../src/core/Descriptor");
const { PrimitiveDescriptor, ObjectDescriptor, ArrayDescriptor } = Descriptor;

describe("Descriptor", () => {

  // ── Exports ────────────────────────────────────────────────────────────────

  describe("module exports", () => {
    test("is frozen", () => {
      expect(Object.isFrozen(Descriptor)).toBe(true);
    });

    test("exports PrimitiveDescriptor", () => {
      expect(typeof PrimitiveDescriptor).toBe("function");
    });

    test("exports ObjectDescriptor", () => {
      expect(typeof ObjectDescriptor).toBe("function");
    });

    test("exports ArrayDescriptor", () => {
      expect(typeof ArrayDescriptor).toBe("function");
    });
  });

  // ── Base class ─────────────────────────────────────────────────────────────

  describe("Descriptor base class", () => {
    test("type getter throws on base class", () => {
      const d = new PrimitiveDescriptor(); // use concrete to get instance
      // patch: test via a bare subclass
      class Bare extends Descriptor {}
      expect(() => new Bare().type).toThrow();
    });

    test("isPure getter throws on base class", () => {
      class Bare extends Descriptor {}
      expect(() => new Bare().isPure).toThrow();
    });

    test("isField is false when name is null (default)", () => {
      expect(new PrimitiveDescriptor().isField).toBe(false);
    });

    test("isField is true when name is set", () => {
      expect(new PrimitiveDescriptor({ name: "id", frequency: 1, variadic: false }).isField).toBe(true);
    });

    test("name defaults to null", () => {
      expect(new PrimitiveDescriptor().name).toBeNull();
    });

    test("frequency defaults to null", () => {
      expect(new PrimitiveDescriptor().frequency).toBeNull();
    });

    test("variadic defaults to null", () => {
      expect(new PrimitiveDescriptor().variadic).toBeNull();
    });

    test("field properties are set from constructor", () => {
      const d = new PrimitiveDescriptor({ name: "score", frequency: 0.8, variadic: false });
      expect(d.name).toBe("score");
      expect(d.frequency).toBe(0.8);
      expect(d.variadic).toBe(false);
    });
  });

  // ── PrimitiveDescriptor ────────────────────────────────────────────────────

  describe("PrimitiveDescriptor", () => {
    test("type is 'primitive'", () => {
      expect(new PrimitiveDescriptor().type).toBe("primitive");
    });

    test("isPure is true", () => {
      expect(new PrimitiveDescriptor().isPure).toBe(true);
    });

    test("isField false by default", () => {
      expect(new PrimitiveDescriptor().isField).toBe(false);
    });

    test("isField true when name set", () => {
      expect(new PrimitiveDescriptor({ name: "x", frequency: 1, variadic: false }).isField).toBe(true);
    });

    test("instanceof Descriptor", () => {
      expect(new PrimitiveDescriptor()).toBeInstanceOf(Descriptor);
    });
  });

  // ── ObjectDescriptor ───────────────────────────────────────────────────────

  describe("ObjectDescriptor", () => {
    const prim = name => new PrimitiveDescriptor({ name, frequency: 1, variadic: false });

    test("type is 'object'", () => {
      expect(new ObjectDescriptor({ fields: [] }).type).toBe("object");
    });

    test("isPure true when all fields are pure", () => {
      const d = new ObjectDescriptor({ fields: [prim("id"), prim("name")] });
      expect(d.isPure).toBe(true);
    });

    test("isPure false when any field is an object array", () => {
      const arrayField = new ArrayDescriptor({
        name: "teams", frequency: 1, variadic: false,
        dimensions: [2], elementType: "object", fields: [prim("name")], isOneLiner: false
      });
      const d = new ObjectDescriptor({ fields: [prim("name"), arrayField] });
      expect(d.isPure).toBe(false);
    });

    test("isPure true when field is a primitive array", () => {
      const arrayField = new ArrayDescriptor({
        name: "scores", frequency: 1, variadic: false,
        dimensions: [3], elementType: "primitive", fields: [], isOneLiner: true
      });
      const d = new ObjectDescriptor({ fields: [prim("name"), arrayField] });
      expect(d.isPure).toBe(true);
    });

    test("variadic is null by default (no parent-level flag)", () => {
      expect(new ObjectDescriptor({ fields: [] }).variadic).toBeNull();
    });

    test("fields are stored correctly", () => {
      const fields = [prim("id"), prim("name")];
      expect(new ObjectDescriptor({ fields }).fields).toBe(fields);
    });

    test("instanceof Descriptor", () => {
      expect(new ObjectDescriptor({ fields: [] })).toBeInstanceOf(Descriptor);
    });

    test("isField false by default", () => {
      expect(new ObjectDescriptor({ fields: [] }).isField).toBe(false);
    });

    test("isField true when name set", () => {
      const d = new ObjectDescriptor({ fields: [], name: "lead", frequency: 1, variadic: false });
      expect(d.isField).toBe(true);
    });
  });

  // ── ArrayDescriptor ────────────────────────────────────────────────────────

  describe("ArrayDescriptor", () => {
    const primArr = (dims, oneLiner = true) => new ArrayDescriptor({
      dimensions: dims, elementType: "primitive", fields: [], isOneLiner: oneLiner
    });

    const objArr = dims => new ArrayDescriptor({
      dimensions: dims, elementType: "object",
      fields: [new PrimitiveDescriptor({ name: "id", frequency: 1, variadic: false })],
      isOneLiner: false
    });

    test("type is 'array'", () => {
      expect(primArr([3]).type).toBe("array");
    });

    test("isPure true for primitive array", () => {
      expect(primArr([3]).isPure).toBe(true);
    });

    test("isPure false for object array", () => {
      expect(objArr([3]).isPure).toBe(false);
    });

    test("isPure true for mixed array", () => {
      const d = new ArrayDescriptor({ dimensions: [3], elementType: "mixed", fields: [], variadic: false, isOneLiner: false });
      expect(d.isPure).toBe(true);
    });

    test("isGrid false for 1D array", () => {
      expect(primArr([3]).isGrid).toBe(false);
    });

    test("isGrid true for 2D array", () => {
      expect(primArr([3, 4]).isGrid).toBe(true);
    });

    test("isGrid true for 3D array", () => {
      expect(primArr([2, 3, 4]).isGrid).toBe(true);
    });

    test("isColumnar true for 1D pure object array", () => {
      expect(objArr([3]).isColumnar).toBe(true);
    });

    test("isColumnar false for grid of objects", () => {
      expect(objArr([3, 2]).isColumnar).toBe(false);
    });

    test("isColumnar false for primitive array", () => {
      expect(primArr([3]).isColumnar).toBe(false);
    });

    test("isColumnar false for impure object array", () => {
      const nestedObjArr = new ArrayDescriptor({
        name: "teams", frequency: 1, variadic: false,
        dimensions: [2], elementType: "object",
        fields: [new PrimitiveDescriptor({ name: "name", frequency: 1, variadic: false })],
        isOneLiner: false
      });
      const impure = new ArrayDescriptor({
        dimensions: [2], elementType: "object",
        fields: [nestedObjArr], isOneLiner: false
      });
      expect(impure.isColumnar).toBe(false);
    });

    test("dims for fixed 1D", () => {
      expect(primArr([3]).dims).toBe("[3]");
    });

    test("dims for variable 1D", () => {
      expect(primArr([null]).dims).toBe("[]");
    });

    test("dims for 2D grid", () => {
      expect(primArr([3, 4]).dims).toBe("[3][4]");
    });

    test("dims for 3D grid", () => {
      expect(primArr([2, 3, 4]).dims).toBe("[2][3][4]");
    });

    test("isOneLiner stored correctly", () => {
      expect(primArr([3], true).isOneLiner).toBe(true);
      expect(primArr([3], false).isOneLiner).toBe(false);
    });

    test("instanceof Descriptor", () => {
      expect(primArr([3])).toBeInstanceOf(Descriptor);
    });

    test("isField false by default", () => {
      expect(primArr([3]).isField).toBe(false);
    });

    test("isField true when name set", () => {
      const d = new ArrayDescriptor({
        name: "scores", frequency: 1, variadic: false,
        dimensions: [3], elementType: "primitive", fields: [], isOneLiner: true
      });
      expect(d.isField).toBe(true);
    });
  });

});