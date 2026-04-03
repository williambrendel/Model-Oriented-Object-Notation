"use strict";

const serialize = require("../src/serialize");

// ── Helper ─────────────────────────────────────────────────────────────────
// Every MOON document starts with three directive lines. Strip them to test
// just the body, or test the full document where directives matter.

const body = str => {
  const lines = str.split("\n");
  const firstBodyIndex = lines.findIndex(line => !line.startsWith("@") && line.trim() !== "");
  return lines.slice(firstBodyIndex).join("\n");
};

describe("serialize", () => {

  // ── Directives ─────────────────────────────────────────────────────────────

  describe("directives", () => {
    test("flat object with no arrays or nulls emits no directives", () => {
      const result = serialize({ id: 1, name: "Alice" }, { addHints: false, addDefinitions: true, addSchemaExamples: true });
      expect(result.split("\n")[0]).not.toMatch(/^@/);
    });

    test("null value emits @null", () => {
      expect(serialize({ role: null }, { addHints: false, addDefinitions: true, addSchemaExamples: true })).toContain("@null: ~");
    });

    test("one-liner array emits @sep", () => {
      expect(serialize({ tags: ["a", "b"] }, { addHints: false, addDefinitions: true, addSchemaExamples: true })).toContain("@sep: |");
    });

    test("array with rows emits @item", () => {
      expect(serialize([{ id: 1 }, { id: 2 }], { addHints: false, addDefinitions: true, addSchemaExamples: true })).toContain("@item: -");
    });

    test("custom nullMarker directive", () => {
      expect(serialize({ role: null }, { nullMarker: "∅", addHints: false, addDefinitions: true, addSchemaExamples: true })).toContain("@null: ∅");
    });

    test("custom fieldSeparator directive", () => {
      expect(serialize({ tags: ["a", "b"] }, { fieldSeparator: ",", addHints: false, addDefinitions: true, addSchemaExamples: true })).toContain("@sep: ,");
    });

    test("custom itemMarker directive", () => {
      expect(serialize([{ id: 1 }], { itemMarker: "*", addHints: false, addDefinitions: true, addSchemaExamples: true })).toContain("@item: *");
    });

    test("hintPrefix emits @hint directive when addHints is true", () => {
      const data = [{ id: 1, name: "Alice" }];
      expect(serialize(data, { addHints: true, hintPrefix: "#", addDefinitions: true, addSchemaExamples: true })).toContain("@hint: #");
    });

    test("addDefinitions: false suppresses token directives", () => {
      const result = serialize({ role: null }, { addDefinitions: false, addHints: false, addSchemaExamples: true });
      expect(result).not.toContain("@null");
    });

    test("blank line separates directives from body when directives present", () => {
      const result   = serialize({ role: null }, { addHints: false, addDefinitions: true, addSchemaExamples: true });
      const lines    = result.split("\n");
      const bodyIdx  = lines.findIndex(l => !l.startsWith("@") && l.trim() !== "");
      expect(lines[bodyIdx - 1]).toBe("");
    });

    test("no blank line when no directives", () => {
      const result = serialize({ id: 1, name: "Alice" }, { addHints: false, addDefinitions: true, addSchemaExamples: true });
      expect(result).toBe("id=1\nname=Alice");
    });
  });

  // ── Example directives ─────────────────────────────────────────────────────

  describe("example directives", () => {
    test("flat columnar array emits @ex_schema", () => {
      const data = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
      expect(serialize(data, { addHints: false, addDefinitions: true, addSchemaExamples: true })).toContain("@ex_schema");
    });

    test("nested columnar array emits @ex_nested and @ex_inline", () => {
      const data = [
        { id: "P1", lead: { id: 1, name: "Alice" } },
        { id: "P2", lead: { id: 2, name: "Bob"   } }
      ];
      const result = serialize(data, { addHints: false, addDefinitions: true, addSchemaExamples: true });
      expect(result).toContain("@ex_nested");
      expect(result).toContain("@ex_inline");
    });

    test("grid emits @ex_grid", () => {
      const data = [[1, 2, 3], [4, 5, 6]];
      expect(serialize(data, { addHints: false, addDefinitions: true, addSchemaExamples: true })).toContain("@ex_grid");
    });

    test("variadic array emits @ex_variadic", () => {
      const data = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob"   },
        { id: 3, name: "Carol" },
        { id: 4, name: "Dave"  },
        { id: 5, name: "Eve"   },
        { id: 6, name: "Frank", note: "vip" }
      ];
      expect(serialize(data, { addHints: false, addDefinitions: true, addSchemaExamples: true })).toContain("@ex_variadic");
    });

    test("primitive-only document emits no @ex_* directives", () => {
      expect(serialize({ name: "Acme", count: 42 }, { addHints: false, addDefinitions: true, addSchemaExamples: true })).not.toContain("@ex_");
    });

    test("addSchemaExamples: false suppresses @ex_* directives", () => {
      const data = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
      expect(serialize(data, { addSchemaExamples: false, addHints: false, addDefinitions: true })).not.toContain("@ex_");
    });
  });

  // ── Primitive roots ────────────────────────────────────────────────────────

  describe("primitive roots", () => {
    test("number", () => {
      expect(body(serialize(42, { addHints: false, addDefinitions: true, addSchemaExamples: true }))).toBe("42");
    });

    test("string", () => {
      expect(body(serialize("hello", { addHints: false, addDefinitions: true, addSchemaExamples: true }))).toBe("hello");
    });

    test("boolean", () => {
      expect(body(serialize(true, { addHints: false, addDefinitions: true, addSchemaExamples: true }))).toBe("true");
    });

    test("null", () => {
      expect(body(serialize(null, { addHints: false, addDefinitions: true, addSchemaExamples: true }))).toBe("~");
    });

    test("undefined", () => {
      expect(body(serialize(undefined, { addHints: false, addDefinitions: true, addSchemaExamples: true }))).toBe("~");
    });

    test("string with pipe is escaped", () => {
      expect(body(serialize("hello|world", { addHints: false, addDefinitions: true, addSchemaExamples: true }))).toBe("hello\\|world");
    });
  });

  // ── Object roots ───────────────────────────────────────────────────────────

  describe("object roots", () => {
    test("flat object", () => {
      expect(body(serialize({ id: 1, name: "Alice" }, { addHints: false, addDefinitions: true, addSchemaExamples: true }))).toBe("id=1\nname=Alice");
    });

    test("object with null field", () => {
      expect(body(serialize({ id: 1, role: null }, { addHints: false, addDefinitions: true, addSchemaExamples: true }))).toBe("id=1\nrole=~");
    });

    test("object with inline pure nested object", () => {
      expect(body(serialize({ budget: { amount: 500000, currency: "USD" } }, { addHints: false, addDefinitions: true, addSchemaExamples: true })))
        .toBe("budget: amount=500000|currency=USD");
    });

    test("object with array field", () => {
      expect(body(serialize({ tags: ["tech", "startup"] }, { addHints: false, addDefinitions: true, addSchemaExamples: true })))
        .toBe("tags[2]: tech|startup");
    });

    test("full document format has directives then blank line then body", () => {
      const result = serialize({ name: "Acme", role: null }, { addHints: false, addDefinitions: true, addSchemaExamples: true });
      expect(body(result)).toBe("name=Acme\nrole=~");
      expect(result).toContain("@null: ~");
      expect(result).toMatch(/@null[^\n]*\n\nname=/);
    });
  });

  // ── Array roots ────────────────────────────────────────────────────────────

  describe("array roots", () => {
    test("primitive array", () => {
      expect(body(serialize([1, 2, 3], { addHints: false, addDefinitions: true, addSchemaExamples: true }))).toBe("[3]: 1|2|3");
    });

    test("object array", () => {
      expect(body(serialize([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }], { addHints: true, addDefinitions: true, addSchemaExamples: true })))
        .toBe("[2]{id|name}:\n- 1|Alice  # id|name\n- 2|Bob");
    });

    test("empty array", () => {
      expect(body(serialize([], { addHints: false, addDefinitions: true, addSchemaExamples: true }))).toBe("[0]:");
    });
  });

  // ── Replacer ───────────────────────────────────────────────────────────────

  describe("replacer", () => {
    test("omits keys returning undefined", () => {
      const data   = { id: 1, password: "secret", name: "Alice" };
      const result = serialize(data, { addHints: false, addDefinitions: true, addSchemaExamples: true, replacer: (key, val) => key === "password" ? undefined : val });
      expect(body(result)).toBe("id=1\nname=Alice");
    });

    test("transforms values", () => {
      const result = serialize(
        { name: "alice" },
        { addHints: false, addDefinitions: true, addSchemaExamples: true, replacer: (key, val) => typeof val === "string" ? val.toUpperCase() : val }
      );
      expect(body(result)).toBe("name=ALICE");
    });

    test("root replacer call uses empty string key", () => {
      // Replacer returning undefined at root → null body
      const result = serialize({ id: 1 }, { addHints: false, addDefinitions: true, addSchemaExamples: true, replacer: (key, val) => key === "" ? undefined : val });
      expect(body(result)).toBe("~");
    });
  });

  // ── variadicMaxFrequency ───────────────────────────────────────────────────

  describe("variadicMaxFrequency", () => {
    test("fields below threshold become variadic", () => {
      // note at 1/6 ≈ 0.167 < default 0.2 → variadic → not in schema
      const data = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob"   },
        { id: 3, name: "Carol" },
        { id: 4, name: "Dave"  },
        { id: 5, name: "Eve"   },
        { id: 6, name: "Frank", note: "vip" }
      ];
      const result = body(serialize(data, { addHints: false, addDefinitions: true, addSchemaExamples: true }));
      expect(result.split("\n")[0]).toContain("...");
      expect(result.split("\n")[0]).not.toContain("note");
    });

    test("custom variadicMaxFrequency raises threshold", () => {
      const data = [
        { id: 1, name: "Alice", role: "admin" },
        { id: 2, name: "Bob",   role: "user"  },
        { id: 3, name: "Carol"                }
      ];
      // role at 2/3 ≈ 0.67 — above default 0.2 but below 0.9 → variadic
      const result = body(serialize(data, { variadicMaxFrequency: 0.9, addHints: false, addDefinitions: true, addSchemaExamples: true }));
      expect(result.split("\n")[0]).toContain("...");
    });
  });

  // ── Full document ──────────────────────────────────────────────────────────

  describe("full document", () => {
    test("company object", () => {
      const data = {
        name: "Acme Corp",
        location: { street: "123 Main St", state: "CA", zip: 80301 },
        tags: ["tech", "startup"]
      };
      expect(body(serialize(data, { addHints: false, addDefinitions: true, addSchemaExamples: true }))).toBe(
        "name=Acme Corp\n" +
        "location: street=123 Main St|state=CA|zip=80301\n" +
        "tags[2]: tech|startup"
      );
    });
  });

  // ── addHints ───────────────────────────────────────────────────────────────

  describe("addHints", () => {
    test("addHints: true appends field hint to first row", () => {
      const data = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
      const result = body(serialize(data, { addHints: true, addDefinitions: true, addSchemaExamples: true }));
      expect(result.split("\n")[1]).toContain("  # id|name");
      expect(result.split("\n")[2]).not.toContain("#");
    });

    test("addHints: true emits @hint directive", () => {
      const data = [{ id: 1, name: "Alice" }];
      expect(serialize(data, { addHints: true, addDefinitions: true, addSchemaExamples: true })).toContain("@hint: #");
    });

    test("addHints: false (default) emits no hints", () => {
      const data = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
      expect(serialize(data, { addHints: false, addDefinitions: true, addSchemaExamples: true })).not.toContain("#");
    });

    test("custom hintPrefix used in both @hint directive and row comment", () => {
      const data   = [{ id: 1, name: "Alice" }];
      const result = serialize(data, { addHints: true, hintPrefix: "//", addDefinitions: true, addSchemaExamples: true });
      expect(result).toContain("@hint: //");
      expect(body(result)).toContain("  // id|name");
    });
  });

  // ── Module ─────────────────────────────────────────────────────────────────

  describe("module", () => {
    test("is a function", () => {
      expect(typeof serialize).toBe("function");
    });

    test("is frozen", () => {
      expect(Object.isFrozen(serialize)).toBe(true);
    });
  });

});