"use strict";

/**
 * @file Descriptor.js
 * @module moon/core/Descriptor
 * @description MOON schema descriptor class hierarchy.
 *
 * A descriptor captures the full structure of a JavaScript value at any depth.
 * Descriptors are produced by analyzeSchema and consumed by the serializer pipeline.
 *
 * ## Class hierarchy
 *
 * ```
 * Descriptor (base)
 *   ├── PrimitiveDescriptor
 *   ├── ObjectDescriptor
 *   └── ArrayDescriptor
 * ```
 *
 * ## Field context
 *
 * When a descriptor is used as a field within an object or array schema, it
 * carries additional field-level properties: `name`, `frequency`, `variadic`.
 * These default to `null` on root descriptors and are set by `analyzeSchema`
 * when building field arrays.
 *
 * `descriptor.isField` returns true when `name` is set — distinguishing field
 * descriptors from root descriptors without a separate `FieldDescriptor` class.
 *
 * ## isPure
 *
 * A descriptor is "pure" when it contains no object array at any depth.
 * Pure descriptors can be encoded inline within a columnar row. Impure
 * descriptors (containing object arrays) require block form.
 *
 * | Descriptor type       | isPure result                               |
 * |-----------------------|---------------------------------------------|
 * | PrimitiveDescriptor   | always true                                 |
 * | ObjectDescriptor      | true iff all fields are pure                |
 * | ArrayDescriptor       | true iff elementType !== "object"           |
 *
 * @example
 * // Root descriptor (isField = false)
 * const d = new ArrayDescriptor({ dimensions: [3], elementType: "primitive", ... });
 * d.isField; // false
 *
 * @example
 * // Field descriptor (isField = true)
 * const d = new PrimitiveDescriptor({ name: "id", frequency: 1, variadic: false });
 * d.isField; // true
 * d.name;    // "id"
 */

// ── Base class ────────────────────────────────────────────────────────────────

/**
 * Base descriptor class. All concrete descriptor types extend this.
 *
 * Carries optional field-level properties (`name`, `frequency`, `variadic`)
 * that are populated when the descriptor is used as a schema field.
 * Root descriptors leave these as `null`.
 */
class Descriptor {
  /**
   * @param {Object}  [field]           - Optional field-level context.
   * @param {string}  [field.name]      - Field name within parent schema.
   * @param {number}  [field.frequency] - Non-null presence frequency 0..1.
   * @param {boolean} [field.variadic]  - True if frequency < variadicMaxFrequency.
   */
  constructor({ name = null, frequency = null, variadic = null } = {}) {
    this.name      = name;
    this.frequency = frequency;
    this.variadic  = variadic;
  }

  /**
   * True when this descriptor is used as a schema field (name is set).
   * False for root descriptors produced directly by analyzeSchema.
   * @type {boolean}
   */
  get isField() { return this.name !== null; }

  /**
   * The MOON type of this descriptor. Implemented by subclasses.
   * @type {"primitive"|"object"|"array"}
   * @abstract
   */
  get type() { throw new Error("Descriptor.type must be implemented by subclass"); }

  /**
   * True when this descriptor contains no object array at any depth.
   * Implemented by subclasses.
   * @type {boolean}
   * @abstract
   */
  get isPure() { throw new Error("Descriptor.isPure must be implemented by subclass"); }
}

// ── PrimitiveDescriptor ───────────────────────────────────────────────────────

/**
 * Descriptor for a primitive value (string, number, boolean, or null).
 *
 * @extends Descriptor
 *
 * @example
 * new PrimitiveDescriptor()
 * // { type: "primitive", isField: false }
 *
 * @example
 * new PrimitiveDescriptor({ name: "id", frequency: 1, variadic: false })
 * // { type: "primitive", isField: true, name: "id", frequency: 1, variadic: false }
 */
class PrimitiveDescriptor extends Descriptor {
  /** @param {ConstructorParameters<typeof Descriptor>[0]} [field] */
  constructor(field) { super(field); }

  /** @type {"primitive"} */
  get type() { return "primitive"; }

  /** Primitives are always pure. @type {true} */
  get isPure() { return true; }
}

// ── ObjectDescriptor ──────────────────────────────────────────────────────────

/**
 * Descriptor for a plain object value.
 *
 * @extends Descriptor
 *
 * @example
 * new ObjectDescriptor({
 *   fields: [ new PrimitiveDescriptor({ name: "id", frequency: 1, variadic: false }) ]
 * })
 */
class ObjectDescriptor extends Descriptor {
  /**
   * @param {Object}       params
   * @param {Descriptor[]} params.fields - Field descriptors for this object's keys.
   * @param {ConstructorParameters<typeof Descriptor>[0]} [params.field] - Field context.
   */
  constructor({ fields, ...field }) {
    super(field);
    this.fields = fields;
  }

  /** @type {"object"} */
  get type() { return "object"; }

  /**
   * True when all fields are pure (no object array at any depth).
   * @type {boolean}
   */
  get isPure() { return this.fields.every(f => f.isPure); }
}

// ── ArrayDescriptor ───────────────────────────────────────────────────────────

/**
 * Descriptor for an array value, including multi-dimensional grids.
 *
 * @extends Descriptor
 *
 * @example
 * // 1D primitive array
 * new ArrayDescriptor({ dimensions: [3], elementType: "primitive", isOneLiner: true, fields: [] })
 *
 * @example
 * // 2D grid of objects
 * new ArrayDescriptor({ dimensions: [3, 2], elementType: "object", fields: [...], isOneLiner: false })
 */
class ArrayDescriptor extends Descriptor {
  /**
   * @param {Object}             params
   * @param {(number|null)[]}    params.dimensions  - One entry per nesting level. null = variable.
   * @param {"primitive"|"object"|"mixed"} params.elementType - Leaf element type.
   * @param {Descriptor[]}       params.fields      - Field descriptors (object arrays only).
   * @param {boolean}            params.isOneLiner  - True if no element contains `|`.
   * @param {ConstructorParameters<typeof Descriptor>[0]} [params.field] - Field context.
   */
  constructor({ dimensions, elementType, fields = [], isOneLiner = false, ...field }) {
    super(field);
    this.dimensions  = dimensions;
    this.elementType = elementType;
    this.fields      = fields;
    this.isOneLiner  = isOneLiner;
  }

  /** @type {"array"} */
  get type() { return "array"; }

  /**
   * True when this array contains no object array at any depth.
   * Primitive arrays are always pure. Object arrays are never pure.
   * @type {boolean}
   */
  get isPure() { return this.elementType !== "object"; }

  /**
   * True when this array has more than one dimension.
   * @type {boolean}
   */
  get isGrid() { return this.dimensions.length > 1; }

  /**
   * True when this is a 1D object array whose fields are all pure.
   * Columnar arrays are encoded with an inline schema + one row per record.
   * @type {boolean}
   */
  get isColumnar() { return this.elementType === "object" && !this.isGrid && this.fields.every(f => f.isPure); }

  /**
   * The dimension annotation string for use in schema declarations.
   * e.g. `[3]`, `[]`, `[2][3][4]`
   * @type {string}
   */
  get dims() {
    return this.dimensions.map(n => n === null ? "[]" : `[${n}]`).join("");
  }
}

/**
 * @ignore
 * Default export with freezing.
 */
Descriptor.PrimitiveDescriptor = PrimitiveDescriptor;
Descriptor.ObjectDescriptor    = ObjectDescriptor;
Descriptor.ArrayDescriptor     = ArrayDescriptor;
module.exports = Object.freeze(Object.defineProperty(Descriptor, "Descriptor", {
  value: Descriptor
}));