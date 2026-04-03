"use strict";

const serializeObject = require("../../src/core/serializeObject");
const serializeArray  = serializeObject.serializeArray;
const analyzeSchema   = require("../../src/core/analyzeSchema");

// ── Descriptor helpers ────────────────────────────────────────────────────────
const desc = value => analyzeSchema(value);

describe("serializeArray", () => {

  // ── One-liner primitive arrays ─────────────────────────────────────────────

  describe("one-liner primitive arrays", () => {
    test("strings at depth 0", () => {
      const d = desc(["core", "revenue", "critical"]);
      expect(serializeArray("tags", ["core", "revenue", "critical"], d, 0))
        .toBe("tags[3]: core|revenue|critical");
    });

    test("numbers at depth 0", () => {
      const d = desc([95, 87, 92]);
      expect(serializeArray("scores", [95, 87, 92], d, 0))
        .toBe("scores[3]: 95|87|92");
    });

    test("null element → ~", () => {
      const d = desc([1, 2, 3]);
      expect(serializeArray("vals", [1, null, 3], d, 0))
        .toBe("vals[3]: 1|~|3");
    });

    test("respects depth indent", () => {
      const d = desc(["a", "b"]);
      expect(serializeArray("tags", ["a", "b"], d, 2))
        .toBe("  tags[2]: a|b");
    });

    test("empty array emits schema only", () => {
      const d = desc(["a", "b", "c"]);
      expect(serializeArray("tags", [], d, 0)).toBe("tags[3]:");
    });
  });

  // ── Block primitive arrays ─────────────────────────────────────────────────

  describe("block primitive arrays", () => {
    test("elements with pipe use block form", () => {
      const d = desc(["hello|world", "foo"]);
      const result = serializeArray("messages", ["hello|world", "foo"], d, 0);
      expect(result).toBe("messages[2]:\n- hello\\|world\n- foo");
    });

    test("each element prefixed with item marker", () => {
      const d = desc(["hello|world", "foo", "bar"]);
      const lines = serializeArray("msgs", ["hello|world", "foo", "bar"], d, 0).split("\n");
      expect(lines[1]).toBe("- hello\\|world");
      expect(lines[2]).toBe("- foo");
      expect(lines[3]).toBe("- bar");
    });

    test("respects depth indent", () => {
      const d = desc(["a|b", "c"]);
      const lines = serializeArray("msgs", ["a|b", "c"], d, 1).split("\n");
      expect(lines[0]).toBe(" msgs[2]:");
      expect(lines[1]).toBe(" - a\\|b");
    });
  });

  // ── Columnar object arrays ─────────────────────────────────────────────────

  describe("columnar object arrays", () => {
    test("flat primitive fields", () => {
      const data = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
      const d    = desc(data);
      expect(serializeArray("users", data, d, 0))
        .toBe("users[2]{id|name}:\n- 1|Alice\n- 2|Bob");
    });

    test("absent field → ~", () => {
      const data = [{ id: 1, name: "Alice", role: "admin" }, { id: 2, name: "Bob", role: null }];
      const d    = desc(data);
      expect(serializeArray("users", data, d, 0))
        .toBe("users[2]{id|name|role}:\n- 1|Alice|admin\n- 2|Bob|~");
    });

    test("nested array field in row", () => {
      const data = [
        { name: "Backend",  coords: [10, 20] },
        { name: "Frontend", coords: [30, 40] }
      ];
      const d = desc(data);
      expect(serializeArray("teams", data, d, 0))
        .toBe("teams[2]{name|coords[2]}:\n- Backend|[10|20]\n- Frontend|[30|40]");
    });

    test("nested object field in row", () => {
      const data = [
        { id: "P1", lead: { id: 1, name: "Alice" } },
        { id: "P2", lead: { id: 2, name: "Bob"   } }
      ];
      const d = desc(data);
      expect(serializeArray("projects", data, d, 0))
        .toBe("projects[2]{id|lead{id|name}}:\n- P1|{1|Alice}\n- P2|{2|Bob}");
    });

    test("nested object with array sub-field", () => {
      const data = [
        { id: "X1", specs: { performance: ["95%", "98%", "97%"], weight: "2.5kg" } },
        { id: "X2", specs: { performance: ["88%", "92%", "90%"], weight: "1.8kg" } }
      ];
      const d = desc(data);
      expect(serializeArray("prototypes", data, d, 0))
        .toBe("prototypes[2]{id|specs{performance[3]|weight}}:\n- X1|{[95%|98%|97%]|2.5kg}\n- X2|{[88%|92%|90%]|1.8kg}");
    });

    test("respects depth indent", () => {
      const data = [{ id: 1 }, { id: 2 }];
      const d    = desc(data);
      const lines = serializeArray("items", data, d, 2).split("\n");
      expect(lines[0]).toMatch(/^ {2}/);   // schema at depth 2
      expect(lines[1]).toMatch(/^ {2}-/);  // rows at same depth 2
    });
  });

  // ── 2D grids ───────────────────────────────────────────────────────────────

  describe("2D grids", () => {
    test("performance_matrix[3][4]", () => {
      const data = [
        [98.5, 85.3, 92.1, null],
        [87.2, null, 91.4, 88.9],
        [95.0, 93.5, 89.7, 90.2]
      ];
      const d      = desc(data);
      const result = serializeArray("performance_matrix", data, d, 0);
      expect(result).toBe(
        "performance_matrix[3][4]:\n" +
        "- 98.5|85.3|92.1|~\n" +
        "- 87.2|~|91.4|88.9\n" +
        "- 95|93.5|89.7|90.2"
      );
    });

    test("respects depth indent", () => {
      const data = [[1, 2], [3, 4]];
      const d    = desc(data);
      const lines = serializeArray("grid", data, d, 1).split("\n");
      expect(lines[0]).toBe(" grid[2][2]:");
      expect(lines[1]).toBe(" - 1|2");
      expect(lines[2]).toBe(" - 3|4");
    });
  });

  // ── 3D grids ───────────────────────────────────────────────────────────────

  describe("3D grids", () => {
    test("sensor_grid[2][3][4]", () => {
      const data = [
        [[1,2,3,4],[5,6,7,8],[9,10,11,12]],
        [[13,14,15,16],[17,18,19,20],[21,22,23,24]]
      ];
      const d      = desc(data);
      const result = serializeArray("sensor_grid", data, d, 0);
      expect(result).toBe(
        "sensor_grid[2][3][4]:\n" +
        "- [1|2|3|4]|[5|6|7|8]|[9|10|11|12]\n" +
        "- [13|14|15|16]|[17|18|19|20]|[21|22|23|24]"
      );
    });
  });

  // ── Grid of objects ────────────────────────────────────────────────────────

  describe("grid of objects", () => {
    test("quantum_states[3][2]{amplitude|phase|probability}", () => {
      const data = [
        [{ amplitude: 0.5, phase: 0.2, probability: 0.25 }, { amplitude: 0.3, phase: 0.8, probability: 0.15 }],
        [{ amplitude: 0.7, phase: 0.1, probability: 0.35 }, { amplitude: 0.2, phase: 0.5, probability: 0.20 }],
        [{ amplitude: 0.4, phase: 0.6, probability: 0.30 }, { amplitude: 0.1, phase: 0.3, probability: 0.10 }]
      ];
      const d      = desc(data);
      const result = serializeArray("quantum_states", data, d, 0);
      expect(result).toBe(
        "quantum_states[3][2]{amplitude|phase|probability}:\n" +
        "- {0.5|0.2|0.25}|{0.3|0.8|0.15}\n" +
        "- {0.7|0.1|0.35}|{0.2|0.5|0.2}\n" +
        "- {0.4|0.6|0.3}|{0.1|0.3|0.1}"
      );
    });
  });

  // ── Mixed arrays ───────────────────────────────────────────────────────────

  describe("mixed arrays", () => {
    test("primitives and pure object — object encodes inline as k=v|k=v", () => {
      const data = [1, { a: "hello", b: "world" }, "text value"];
      const d    = desc(data);
      const result = serializeArray("items", data, d, 0);
      expect(result).toBe(
        "items[3]:\n" +
        "- 1\n" +
        "- a=hello|b=world\n" +
        "- text value"
      );
    });

    test("complex object in mixed array expands as block", () => {
      const data = [1, { a: "hello", nested: { x: 1 } }, "text"];
      const d    = desc(data);
      const lines = serializeArray("items", data, d, 0).split("\n");
      expect(lines[1]).toBe("- 1");
      expect(lines[2]).toMatch(/^- a=hello/);
      expect(lines[3]).toMatch(/^ {2}nested:/);
    });

    test("null in mixed array → ~", () => {
      const data = [1, { a: "x" }, null, "text"];
      const d    = desc(data);
      const lines = serializeArray("vals", data, d, 0).split("\n");
      expect(lines[1]).toBe("- 1");
      expect(lines[2]).toBe("- a=x");
      expect(lines[3]).toBe("- ~");
      expect(lines[4]).toBe("- text");
    });

    test("respects depth indent", () => {
      const data = [1, { a: "x" }];
      const d    = desc(data);
      const lines = serializeArray("items", data, d, 1).split("\n");
      expect(lines[0]).toBe(" items[2]:");
      expect(lines[1]).toBe(" - 1");
      expect(lines[2]).toBe(" - a=x");
    });

    test("sets hasItem on context", () => {
      const data = [1, { a: "x" }];
      const ctx  = {};
      serializeArray("items", data, desc(data), 0, ctx);
      expect(ctx.hasItem).toBe(true);
    });
  });

  // ── isPure dispatch ────────────────────────────────────────────────────────

  describe("isPure dispatch", () => {
    test("object array with nested object array → block form (no schema braces)", () => {
      const data = [
        { name: "Engineering", teams: [{ name: "Backend" }] },
        { name: "Marketing",   teams: [{ name: "Growth"  }] }
      ];
      const d      = desc(data);
      const result = serializeArray("departments", data, d, 0);
      // Block form: schema line has no {fields}, just [n]:
      expect(result.split("\n")[0]).toBe("departments[2]:");
    });

    test("block form first record starts with item marker on same line as first field", () => {
      const data = [
        { name: "Engineering", teams: [{ name: "Backend" }] },
        { name: "Marketing",   teams: [{ name: "Growth"  }] }
      ];
      const d     = desc(data);
      const lines = serializeArray("departments", data, d, 0).split("\n");
      expect(lines[1]).toMatch(/^- name=/);
    });
  });

  // ── Context flags ──────────────────────────────────────────────────────────

  describe("context flags", () => {
    test("flat columnar array sets hasSchema", () => {
      const data = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
      const ctx  = {};
      serializeArray("users", data, desc(data), 0, ctx);
      expect(ctx.hasSchema).toBe(true);
      expect(ctx.hasNested).toBeFalsy();
    });

    test("columnar array with nested fields sets hasNested and hasInline", () => {
      const data = [
        { id: "P1", lead: { id: 1, name: "Alice" } },
        { id: "P2", lead: { id: 2, name: "Bob"   } }
      ];
      const ctx = {};
      serializeArray("projects", data, desc(data), 0, ctx);
      expect(ctx.hasNested).toBe(true);
      expect(ctx.hasInline).toBe(true);
      expect(ctx.hasSchema).toBeFalsy();
    });

    test("columnar array with nested array field sets hasNested and hasInline", () => {
      const data = [
        { name: "Backend",  coords: [10, 20] },
        { name: "Frontend", coords: [30, 40] }
      ];
      const ctx = {};
      serializeArray("teams", data, desc(data), 0, ctx);
      expect(ctx.hasNested).toBe(true);
      expect(ctx.hasInline).toBe(true);
    });

    test("grid sets hasGrid", () => {
      const data = [[1, 2, 3], [4, 5, 6]];
      const ctx  = {};
      serializeArray("matrix", data, desc(data), 0, ctx);
      expect(ctx.hasGrid).toBe(true);
    });

    test("grid of objects sets hasGrid and hasInline", () => {
      const data = [
        [{ a: 1, b: 2 }, { a: 3, b: 4 }],
        [{ a: 5, b: 6 }, { a: 7, b: 8 }]
      ];
      const ctx = {};
      serializeArray("grid", data, desc(data), 0, ctx);
      expect(ctx.hasGrid).toBe(true);
      expect(ctx.hasInline).toBe(true);
    });

    test("variadic fields set hasVariadic", () => {
      const data = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob"   },
        { id: 3, name: "Carol" },
        { id: 4, name: "Dave"  },
        { id: 5, name: "Eve"   },
        { id: 6, name: "Frank", note: "vip" }
      ];
      const ctx = {};
      serializeArray("users", data, desc(data), 0, ctx);
      expect(ctx.hasVariadic).toBe(true);
    });

    test("context is optional — no error without it", () => {
      const data = [{ id: 1 }];
      expect(() => serializeArray("items", data, desc(data), 0)).not.toThrow();
    });
  });

  // ── addHints ───────────────────────────────────────────────────────────────

  describe("addHints", () => {
    test("appends field list comment to first row only", () => {
      const data = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
      const d    = desc(data);
      const result = serializeArray("users", data, d, 0, null, { addHints: true });
      const lines  = result.split("\n");
      expect(lines[1]).toBe("- 1|Alice  # id|name");
      expect(lines[2]).toBe("- 2|Bob");
    });

    test("hint uses full field list including nested types", () => {
      const data = [
        { id: "P1", lead: { id: 1, name: "Alice" } },
        { id: "P2", lead: { id: 2, name: "Bob"   } }
      ];
      const d      = desc(data);
      const result = serializeArray("projects", data, d, 0, null, { addHints: true });
      expect(result.split("\n")[1]).toContain("# id|lead{id|name}");
    });

    test("custom hintPrefix", () => {
      const data = [{ id: 1, name: "Alice" }];
      const d    = desc(data);
      const result = serializeArray("users", data, d, 0, null, { addHints: true, hintPrefix: "//" });
      expect(result.split("\n")[1]).toContain("// id|name");
    });

    test("no hint when addHints is false (default)", () => {
      const data = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
      const d    = desc(data);
      const result = serializeArray("users", data, d, 0);
      expect(result).not.toContain("#");
    });

    test("no hint on grids", () => {
      const data = [[1, 2], [3, 4]];
      const d    = desc(data);
      const result = serializeArray("grid", data, d, 0, null, { addHints: true });
      expect(result).not.toContain("#");
    });

    test("no hint on empty arrays", () => {
      const data = [];
      const d    = desc([{ id: 1 }]);
      const result = serializeArray("users", data, d, 0, null, { addHints: true });
      expect(result).not.toContain("#");
    });

    test("variadic fields included in hint", () => {
      const data = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob"   },
        { id: 3, name: "Carol" },
        { id: 4, name: "Dave"  },
        { id: 5, name: "Eve"   },
        { id: 6, name: "Frank", note: "vip" }
      ];
      const d      = desc(data);
      const result = serializeArray("users", data, d, 0, null, { addHints: true });
      expect(result.split("\n")[1]).toContain("# id|name|...");
    });
  });

  // ── compression ────────────────────────────────────────────────────────────

  describe("compression", () => {
    const flatData   = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
    const nestedData = [
      { id: "P1", lead: { id: 1, name: "Alice" } },
      { id: "P2", lead: { id: 2, name: "Bob"   } }
    ];
    const gridData = [[1, 2, 3], [4, 5, 6]];

    describe("high (default)", () => {
      test("flat columnar uses columnar form", () => {
        const result = serializeArray("users", flatData, desc(flatData), 0, null, { compression: "high" });
        expect(result.split("\n")[0]).toContain("{id|name}");
      });

      test("nested columnar uses columnar form", () => {
        const result = serializeArray("projects", nestedData, desc(nestedData), 0, null, { compression: "high" });
        expect(result.split("\n")[0]).toContain("{id|lead{id|name}}");
      });

      test("grid uses compact rows", () => {
        const result = serializeArray("grid", gridData, desc(gridData), 0, null, { compression: "high" });
        expect(result.split("\n")[1]).toBe("- 1|2|3");
      });
    });

    describe("medium", () => {
      test("flat columnar still uses columnar form", () => {
        const result = serializeArray("users", flatData, desc(flatData), 0, null, { compression: "medium" });
        expect(result.split("\n")[0]).toContain("{id|name}");
        expect(result.split("\n")[1]).toBe("- 1|Alice");
      });

      test("nested columnar falls back to block complex", () => {
        const result = serializeArray("projects", nestedData, desc(nestedData), 0, null, { compression: "medium" });
        expect(result.split("\n")[0]).not.toContain("{");
        expect(result.split("\n")[1]).toMatch(/^- id=/);
      });

      test("grid uses full schema with nested rows", () => {
        const result = serializeArray("grid", gridData, desc(gridData), 0, null, { compression: "medium" });
        expect(result.split("\n")[0]).toBe("grid[2][3]:");
        expect(result.split("\n")[1]).toBe("- [3]: 1|2|3");
        expect(result.split("\n")[2]).toBe("- [3]: 4|5|6");
      });
    });

    describe("low", () => {
      test("flat columnar falls back to block complex", () => {
        const result = serializeArray("users", flatData, desc(flatData), 0, null, { compression: "low" });
        expect(result.split("\n")[0]).not.toContain("{");
        expect(result.split("\n")[1]).toMatch(/^- id=/);
      });

      test("nested columnar falls back to block complex", () => {
        const result = serializeArray("projects", nestedData, desc(nestedData), 0, null, { compression: "low" });
        expect(result.split("\n")[0]).not.toContain("{");
        expect(result.split("\n")[1]).toMatch(/^- id=/);
      });

      test("grid uses full schema with nested rows", () => {
        const result = serializeArray("grid", gridData, desc(gridData), 0, null, { compression: "low" });
        expect(result.split("\n")[0]).toBe("grid[2][3]:");
        expect(result.split("\n")[1]).toBe("- [3]: 1|2|3");
        expect(result.split("\n")[2]).toBe("- [3]: 4|5|6");
      });
    });
  });

  // ── Module ─────────────────────────────────────────────────────────────────

  describe("module", () => {
    test("is a function", () => {
      expect(typeof serializeArray).toBe("function");
    });
  });

});

describe("serializeObject", () => {

  // ── Guards ─────────────────────────────────────────────────────────────────

  describe("guards", () => {
    test("returns empty string for null", () => {
      expect(serializeObject(null, 0)).toBe("");
    });

    test("returns empty string for undefined", () => {
      expect(serializeObject(undefined, 0)).toBe("");
    });

    test("returns empty string for array", () => {
      expect(serializeObject([], 0)).toBe("");
    });

    test("returns empty string for primitive", () => {
      expect(serializeObject(42, 0)).toBe("");
    });

    test("returns empty string for empty object", () => {
      expect(serializeObject({}, 0)).toBe("");
    });
  });

  // ── Primitive fields ───────────────────────────────────────────────────────

  describe("primitive fields", () => {
    test("encodes string field", () => {
      expect(serializeObject({ name: "Alice" }, 0)).toBe("name=Alice");
    });

    test("encodes number field", () => {
      expect(serializeObject({ id: 42 }, 0)).toBe("id=42");
    });

    test("encodes boolean field", () => {
      expect(serializeObject({ active: true }, 0)).toBe("active=true");
    });

    test("encodes null field as ~", () => {
      expect(serializeObject({ role: null }, 0)).toBe("role=~");
    });

    test("encodes undefined field as ~", () => {
      expect(serializeObject({ role: undefined }, 0)).toBe("role=~");
    });

    test("escapes pipe in string value", () => {
      expect(serializeObject({ msg: "hello|world" }, 0)).toBe("msg=hello\\|world");
    });

    test("multiple primitive fields", () => {
      expect(serializeObject({ id: 1, name: "Alice", active: true }, 0))
        .toBe("id=1\nname=Alice\nactive=true");
    });
  });

  // ── Inline pure objects ────────────────────────────────────────────────────

  describe("inline pure nested objects", () => {
    test("encodes pure nested object inline", () => {
      expect(serializeObject({ budget: { amount: 500000, currency: "USD" } }, 0))
        .toBe("budget: amount=500000|currency=USD");
    });

    test("encodes pure nested object with null value inline", () => {
      expect(serializeObject({ budget: { amount: 10000, currency: null } }, 0))
        .toBe("budget: amount=10000|currency=~");
    });

    test("location example", () => {
      expect(serializeObject({ location: { street: "123 Main St", state: "CA", zip: 80301 } }, 0))
        .toBe("location: street=123 Main St|state=CA|zip=80301");
    });

    test("contact example", () => {
      expect(serializeObject({ contact: { email: "info@acme.com", phone: "+1 555 0100" } }, 0))
        .toBe("contact: email=info@acme.com|phone=+1 555 0100");
    });
  });

  // ── Complex nested objects ─────────────────────────────────────────────────

  describe("complex nested objects", () => {
    test("nested object with array field uses block form", () => {
      const result = serializeObject({ company: { name: "Acme", tags: ["tech", "startup"] } }, 0);
      expect(result).toBe("company:\n name=Acme\n tags[2]: tech|startup");
    });

    test("nested object with nested object uses block form", () => {
      const result = serializeObject({
        company: { address: { city: "Boulder", state: "CO" } }
      }, 0);
      expect(result).toBe("company:\n address: city=Boulder|state=CO");
    });

    test("empty nested object emits label only", () => {
      expect(serializeObject({ meta: {} }, 0)).toBe("meta:");
    });
  });

  // ── Array fields ───────────────────────────────────────────────────────────

  describe("array fields", () => {
    test("one-liner primitive array", () => {
      expect(serializeObject({ tags: ["core", "api"] }, 0))
        .toBe("tags[2]: core|api");
    });

    test("columnar object array", () => {
      const result = serializeObject({
        users: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]
      }, 0);
      expect(result).toBe("users[2]{id|name}:\n- 1|Alice\n- 2|Bob");
    });

    test("empty array", () => {
      const result = serializeObject({ tags: [] }, 0);
      expect(result).toBe("tags[0]:");
    });
  });

  // ── Depth indentation ──────────────────────────────────────────────────────

  describe("depth indentation", () => {
    test("depth 0 has no indent", () => {
      const lines = serializeObject({ id: 1, name: "Alice" }, 0).split("\n");
      lines.forEach(l => expect(l).toMatch(/^[^ ]/));
    });

    test("depth 1 indents all lines by 1 space", () => {
      const lines = serializeObject({ id: 1, name: "Alice" }, 1).split("\n");
      lines.forEach(l => expect(l).toMatch(/^ /));
    });

    test("depth 2 indents all lines by 2 spaces", () => {
      const lines = serializeObject({ id: 1 }, 2).split("\n");
      lines.forEach(l => expect(l).toMatch(/^ {2}/));
    });

    test("nested block object indents content one deeper", () => {
      const lines = serializeObject({
        company: { name: "Acme", tags: ["x"] }
      }, 0).split("\n");
      expect(lines[0]).toBe("company:");
      expect(lines[1]).toMatch(/^ /);  // content at depth 1
    });
  });

  // ── Mixed content ──────────────────────────────────────────────────────────

  describe("mixed content", () => {
    test("primitives + inline object + array", () => {
      const result = serializeObject({
        name: "Acme Corp",
        location: { street: "123 Main", state: "CA" },
        tags: ["tech", "startup"]
      }, 0);
      expect(result).toBe(
        "name=Acme Corp\n" +
        "location: street=123 Main|state=CA\n" +
        "tags[2]: tech|startup"
      );
    });
  });

  // ── Context passthrough ────────────────────────────────────────────────────

  describe("context passthrough", () => {
    test("context is optional — no error without it", () => {
      expect(() => serializeObject({ id: 1 }, 0)).not.toThrow();
    });

    test("array field sets context flags", () => {
      const ctx = {};
      serializeObject({ users: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }] }, 0, ctx);
      expect(ctx.hasSchema).toBe(true);
    });

    test("nested object with array propagates context", () => {
      const ctx = {};
      serializeObject({ company: { tags: ["tech", "startup"] } }, 0, ctx);
      // tags is a one-liner primitive array — no context flags set
      expect(ctx.hasSchema).toBeFalsy();
      expect(ctx.hasNested).toBeFalsy();
    });

    test("nested columnar array with object fields sets hasNested", () => {
      const ctx = {};
      serializeObject({
        projects: [
          { id: "P1", lead: { id: 1, name: "Alice" } },
          { id: "P2", lead: { id: 2, name: "Bob"   } }
        ]
      }, 0, ctx);
      expect(ctx.hasNested).toBe(true);
      expect(ctx.hasInline).toBe(true);
    });

    test("grid field sets hasGrid", () => {
      const ctx = {};
      serializeObject({ matrix: [[1, 2], [3, 4]] }, 0, ctx);
      expect(ctx.hasGrid).toBe(true);
    });
  });

  // ── Module ─────────────────────────────────────────────────────────────────

  describe("module", () => {
    test("is a function", () => {
      expect(typeof serializeObject).toBe("function");
    });

    test("is frozen", () => {
      expect(Object.isFrozen(serializeObject)).toBe(true);
    });
  });

});