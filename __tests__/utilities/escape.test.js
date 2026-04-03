"use strict";

const escape = require("../../src/utilities/escape");

describe("escape", () => {

  // ── Pass-through ───────────────────────────────────────────────────────────

  describe("pass-through", () => {
    test("returns plain string unchanged", () => {
      expect(escape("Alice")).toBe("Alice");
    });

    test("returns empty string unchanged", () => {
      expect(escape("")).toBe("");
    });

    test("returns null unchanged", () => {
      expect(escape(null)).toBeNull();
    });

    test("returns undefined unchanged", () => {
      expect(escape(undefined)).toBeUndefined();
    });

    test("returns number unchanged", () => {
      expect(escape(42)).toBe(42);
    });

    test("returns boolean unchanged", () => {
      expect(escape(true)).toBe(true);
    });

    test("returns 0 (falsy number) unchanged", () => {
      expect(escape(0)).toBe(0);
    });
  });

  // ── Backslash ──────────────────────────────────────────────────────────────

  describe("backslash escaping", () => {
    test("escapes single backslash", () => {
      expect(escape("\\")).toBe("\\\\");
    });

    test("escapes backslash in path", () => {
      expect(escape("C:\\path\\file")).toBe("C:\\\\path\\\\file");
    });

    test("backslash is escaped before other characters to prevent double-escaping", () => {
      // If backslash were not processed first, \| could become \\| then \\\\|
      expect(escape("\\|")).toBe("\\\\\\|");
    });
  });

  // ── Pipe ───────────────────────────────────────────────────────────────────

  describe("pipe escaping", () => {
    test("escapes single pipe", () => {
      expect(escape("|")).toBe("\\|");
    });

    test("escapes pipe in field value", () => {
      expect(escape("hello|world")).toBe("hello\\|world");
    });

    test("escapes multiple pipes", () => {
      expect(escape("a|b|c")).toBe("a\\|b\\|c");
    });
  });

  // ── Tilde ──────────────────────────────────────────────────────────────────

  describe("tilde escaping", () => {
    test("escapes lone tilde (reserved null token)", () => {
      expect(escape("~")).toBe("\\~");
    });

    test("escapes tilde within a string", () => {
      expect(escape("approx~value")).toBe("approx\\~value");
    });

    test("escapes multiple tildes", () => {
      expect(escape("~~")).toBe("\\~\\~");
    });
  });

  // ── Newline / carriage return ──────────────────────────────────────────────

  describe("newline and carriage return escaping", () => {
    test("escapes LF", () => {
      expect(escape("line1\nline2")).toBe("line1\\nline2");
    });

    test("escapes CR", () => {
      expect(escape("line1\rline2")).toBe("line1\\rline2");
    });

    test("escapes CRLF sequence", () => {
      expect(escape("line1\r\nline2")).toBe("line1\\r\\nline2");
    });
  });

  // ── Tab ────────────────────────────────────────────────────────────────────

  describe("tab escaping", () => {
    test("escapes horizontal tab", () => {
      expect(escape("\t")).toBe("\\t");
    });

    test("escapes tab within string", () => {
      expect(escape("col1\tcol2")).toBe("col1\\tcol2");
    });
  });

  // ── Other control characters ───────────────────────────────────────────────

  describe("other control character escaping", () => {
    test("escapes vertical tab", () => {
      expect(escape("\v")).toBe("\\v");
    });

    test("escapes form feed", () => {
      expect(escape("\f")).toBe("\\f");
    });

    test("escapes null byte", () => {
      expect(escape("\0")).toBe("\\0");
    });
  });

  // ── Unicode line terminators ───────────────────────────────────────────────

  describe("Unicode line terminator escaping", () => {
    test("escapes Unicode Line Separator (U+2028)", () => {
      expect(escape("\u2028")).toBe("\\u2028");
    });

    test("escapes Unicode Paragraph Separator (U+2029)", () => {
      expect(escape("\u2029")).toBe("\\u2029");
    });

    test("escapes U+2028 within a string", () => {
      expect(escape("before\u2028after")).toBe("before\\u2028after");
    });
  });

  // ── Combined ───────────────────────────────────────────────────────────────

  describe("combined escaping", () => {
    test("escapes pipe and newline in same string", () => {
      expect(escape("a|b\nc")).toBe("a\\|b\\nc");
    });

    test("escapes backslash, pipe, and tilde together", () => {
      expect(escape("\\|~")).toBe("\\\\\\|\\~");
    });

    test("escapes all whitespace control characters", () => {
      expect(escape("\t\v\f\r\n")).toBe("\\t\\v\\f\\r\\n");
    });

    test("leaves unescaped characters untouched in mixed string", () => {
      expect(escape("Hello, World! 42 true")).toBe("Hello, World! 42 true");
    });

    test("handles Unicode text without escaping non-special characters", () => {
      expect(escape("café résumé naïve")).toBe("café résumé naïve");
    });

    test("handles emoji without escaping", () => {
      expect(escape("hello 👋 world")).toBe("hello 👋 world");
    });
  });

});