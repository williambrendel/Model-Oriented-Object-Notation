"use strict";

const applyReplacer = require("../../src/utilities/applyReplacer");

describe("applyReplacer", () => {
  const id = (key, val) => val; // identity replacer

  describe("root call", () => {
    test("calls replacer with empty string key for root", () => {
      const keys = [];
      applyReplacer("", { id: 1 }, (key, val) => { keys.push(key); return val; });
      expect(keys[0]).toBe("");
    });

    test("returns undefined when replacer returns undefined at root", () => {
      expect(applyReplacer("", { id: 1 }, () => undefined)).toBeUndefined();
    });
  });

  describe("objects", () => {
    test("omits key when replacer returns undefined", () => {
      const result = applyReplacer("", { id: 1, password: "secret", name: "Alice" },
        (key, val) => key === "password" ? undefined : val
      );
      expect(result).toEqual({ id: 1, name: "Alice" });
      expect(result.password).toBeUndefined();
    });

    test("transforms string values", () => {
      const result = applyReplacer("", { id: 1, name: "alice" },
        (key, val) => typeof val === "string" ? val.toUpperCase() : val
      );
      expect(result).toEqual({ id: 1, name: "ALICE" });
    });

    test("identity replacer returns original structure", () => {
      const data = { id: 1, name: "Alice" };
      expect(applyReplacer("", data, id)).toEqual(data);
    });
  });

  describe("arrays", () => {
    test("recurses into array elements", () => {
      const result = applyReplacer("", [{ id: 1, pw: "x" }, { id: 2, pw: "y" }],
        (key, val) => key === "pw" ? undefined : val
      );
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    test("filters out undefined elements", () => {
      const result = applyReplacer("", [1, 2, 3],
        (key, val) => typeof val === "number" && val === 2 ? undefined : val
      );
      expect(result).toEqual([1, 3]);
    });
  });

  describe("nested structures", () => {
    test("recurses into nested objects", () => {
      const data = { user: { name: "Alice", password: "secret" } };
      const result = applyReplacer("", data,
        (key, val) => key === "password" ? undefined : val
      );
      expect(result).toEqual({ user: { name: "Alice" } });
    });

    test("masks values by key at any depth", () => {
      const data = [
        { id: 1, ip: "192.168.1.1" },
        { id: 2, ip: "10.0.0.5"    }
      ];
      const result = applyReplacer("", data,
        (key, val) => key === "ip" ? "x.x.x.x" : val
      );
      expect(result[0].ip).toBe("x.x.x.x");
      expect(result[1].ip).toBe("x.x.x.x");
    });
  });

  describe("primitives", () => {
    test("returns primitive unchanged via identity", () => {
      expect(applyReplacer("key", 42, id)).toBe(42);
      expect(applyReplacer("key", "hello", id)).toBe("hello");
      expect(applyReplacer("key", true, id)).toBe(true);
    });

    test("transforms primitive value", () => {
      const result = applyReplacer("key", "hello",
        (key, val) => typeof val === "string" ? val.toUpperCase() : val
      );
      expect(result).toBe("HELLO");
    });
  });
});