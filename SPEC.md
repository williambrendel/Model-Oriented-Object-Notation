# MOON Specification

## Model-Oriented Object Notation

> *Take TOON to the MOON*
> *Symbol:* {M}

**Version:** 0.6

**Status:** Working Draft

---

## Abstract

Model-Oriented Object Notation (MOON) is a line-oriented, indentation-based text format designed specifically for model input — data, prompts, instructions, and context alike.

MOON is built on one core insight: **objects are self-describing, arrays are not.** An object's keys carry their own meaning — no schema is needed. An array's rows lose their keys in positional encoding — a schema is required to recover them.

This produces a clean two-tier encoding:

- **Objects** → labeled `key:` blocks or `key=value` lines. Always self-describing. No schema.
- **Arrays** → inline schema declaration at the field site, then positional data rows.

MOON uses pipe delimiters to reduce escaping, a single reserved token (`~` for null/absent), configurable tokens via `@`-directives, and a `-` item prefix for array rows. All array lengths are declared inline in the schema — no separate count lines.

---

## Table of Contents

1. [Terminology](#1-terminology)
2. [Directives](#2-directives)
3. [Data Model](#3-data-model)
4. [Object Encoding](#4-object-encoding)
5. [Array Encoding](#5-array-encoding)
6. [Schema Declarations](#6-schema-declarations)
7. [Special Tokens](#7-special-tokens)
8. [Escaping](#8-escaping)
9. [Variadic Fields](#9-variadic-fields)
10. [Indentation](#10-indentation)
11. [Compression Levels](#11-compression-levels)
12. [Token Summary](#12-token-summary)
13. [Conformance](#13-conformance)
14. [Examples](#14-examples)
- [Appendix A: Comparison with TOON](#appendix-a-comparison-with-toon)
- [Appendix B: Design Rationale](#appendix-b-design-rationale)
- [Appendix C: License](#appendix-c-license)

---

## 1. Terminology

- **Object**: An ordered mapping from string keys to values.
- **Array**: An ordered sequence of values sharing a common schema.
- **Schema**: An inline declaration at an array field site describing the element structure.
- **Record**: One element of an array, encoded positionally according to its schema.
- **Primitive**: A string, number, boolean, or null value.
- **Pure object**: An object whose field values are all primitives. May be encoded on one line.
- **Labeled block**: A `key:` line followed by indented content. Used for nested objects and arrays.
- **One-liner array**: A primitive array with no `|` in any element. Encoded on a single line.
- **Block array**: A primitive array with at least one element containing `|`. Encoded one item per line.
- **Columnar array**: An object array whose fields are all pure. Encoded as an inline schema followed by `-` prefixed rows.
- **Block complex array**: An object array with at least one impure field (containing a nested object array). Encoded as a `name[n]:` label followed by indented `serializeObject` blocks.
- **Mixed array**: An array whose elements are not all the same type (e.g. primitives and objects). Each element is encoded individually based on its actual type.
- **Compression level**: An encoder option controlling the trade-off between token density and format familiarity. `high` (default) uses full MOON encoding. `medium` disables inline nested encoding. `low` expands all arrays and grids to block form.
- **Active delimiter**: `|` — the pipe character separating values on a single line.
- **Item marker**: `-` — the row prefix for every record in an array data block.
- **Indent unit**: One space. One indent unit = one nesting level.
- **`~` token**: The only reserved data token. Means null / absent.
- **Directive**: An `@key:value` line at the top of a document.
- **Token directive**: A directive that overrides a default encoding token.
- **Example directive**: A directive that provides an inline decoding hint for model comprehension.
- **Hint line**: A line whose first non-whitespace character matches the `@hint` prefix. Ignored by the decoder.

The key words MUST, MUST NOT, SHOULD, MAY follow RFC 2119.

---

## 2. Directives

Directives appear at the top of a MOON document, before any data. There are two kinds: token directives and example directives.

### 2.1 Token Directives

Token directives declare the active encoding tokens. They are **conditional** — an encoder MUST NOT emit a token directive unless the corresponding pattern actually appears in the document body. A flat object with no arrays or nulls emits no token directives at all.

| Directive | Default | Emitted when | Meaning |
|-----------|---------|-------------|---------|
| `@null`   | `~`     | Any `~` in output | Null / absent value marker |
| `@sep`    | `\|`    | Any `\|` separator used | Field separator in rows and one-liner arrays |
| `@item`   | `-`     | Any `-` row prefix used | Row prefix for array records |
| `@hint`   | —       | When `hintPrefix` option set | Comment prefix character (no default) |

`@hint` has no default — hint lines are only recognized when `@hint` is explicitly declared. The `@hint` value MUST be exactly 1 character in strict mode. Lines whose first non-whitespace character matches the `@hint` prefix MUST be ignored by the decoder.

Decoders MUST apply all token directives before parsing any data.

**Example — document with nulls, separators and rows:**
```
@null: ~
@sep: |
@item: -
```

**Example — flat object, no directives needed:**
```
id=42
name=Alice
active=true
```

### 2.2 Example Directives

Example directives provide inline decoding hints for model comprehension. They are emitted by encoders when the document contains the corresponding encoding pattern. Decoders MUST ignore all example directives.

Example directives are **conditional** — an encoder MUST NOT emit an example directive unless the corresponding pattern actually appears in the document body.

| Directive      | Emitted when | Shows |
|----------------|-------------|-------|
| `@ex_schema`   | Any columnar array with flat primitive fields | Schema declaration + one data row |
| `@ex_nested`   | Any columnar array with nested object or array fields | Nested schema + one row with `{...}` or `[...]` |
| `@ex_grid`     | Any grid (`dimensions.length > 1`) | Grid schema + one row |
| `@ex_inline`   | Any inline `{...}` or `[...]` within rows | Inline value shapes |
| `@ex_variadic` | Any array with variadic fields (`...` in schema) | Variadic schema + rows with and without extras |

Each example directive value is a compact one-liner: schema declaration, `: `, one representative data row.

**Example:**
```
@ex_schema: u[3]{id|name}: - 1|Alice
@ex_nested: u[2]{val|obj{a|b}|arr[]}: - v|{x|y}|[a|b]
@ex_grid: m[2][3]: - 1|2|3
@ex_inline: a[2]:x|y o:a=b|c=d
@ex_variadic: u[3]{id|name|...}: - 1|Alice -- 3|Carol|x=v
```

### 2.3 Full Header Example

A document containing columnar, nested, and grid arrays would open with:

```
@null: ~
@sep: |
@item: -
@ex_schema: users[3]{id|name|role}: - 1|Alice|admin
@ex_nested: projects[2]{id|lead{id|name}|tags[]}: - P1|{1|Alice}|[auth|security]
@ex_grid: matrix[3][4]: - 98.5|85.3|92.1|~
@ex_inline: arr=[v1|v2] obj={v1|v2} nested={[v1|v2]|scalar}
```

A document with only flat primitive data would open with just:

```
@null: ~
@sep: |
@item: -
```

---

## 3. Data Model

MOON models the following value types:

- **Primitive**: string, number, boolean, or null.
- **Object**: ordered mapping from string keys to values.
- **Array**: ordered sequence of values.

MOON is a superset of the JSON data model for encoding purposes. Null is represented by `~` in data (or the value of `@null` if overridden).

---

## 4. Object Encoding

Objects are always self-describing. MOON never emits a schema for an object.

### 4.1 Primitive Fields

Each primitive field is encoded as a `key=value` line:

```
id=42
name=Alice
active=true
score=~
```

Absent fields emit `key=~`.

### 4.2 Nested Object Fields

A field whose value is an object is encoded as a `key:` label followed by indented content:

```
company:
 name=Acme Corp
 location:
  street=123 Main St
  city=Boulder
  zip=80301
```

### 4.3 Inline Pure Object

A field whose value is a pure object (all primitive values) MAY be encoded on one line as pipe-separated `key=value` pairs:

```
budget: amount=500000|currency=USD
location: street=123 Main St|state=CA|zip=80301
contact: email=info@acme.com|phone=+1 555 0100
```

The parser distinguishes inline objects from arrays by the presence of `=` in the value tokens. Encoders SHOULD use the inline form when all values are primitive and no value contains `|`.

### 4.4 Array Fields

A field whose value is an array is encoded as an inline schema declaration followed by the array data block. See Section 5.

### 4.5 Root Label

A named document begins with the root key as a label at indent 0:

```
company:
 name=Acme Corp
 ...
```

---

## 5. Array Encoding

Arrays carry an inline schema declaration at their field site. The schema is always immediately above the data it describes. All array lengths are declared in the schema — there are no separate runtime count lines.

### 5.1 One-Liner Primitive Array

When all elements are primitives and no element contains `|`, the array is encoded on a single line:

```
tags[3]: core|revenue|critical
priorities[4]: auth|scaling|security|monitoring
channels[3]: twitter|linkedin|email
```

The `|` character separates elements. An element that is `~` means the slot is null.

### 5.2 Block Primitive Array

When any element contains `|` (requiring `\|` escape), each element is encoded on its own line, prefixed by the item marker:

```
messages[3]:
- hello\|world
- foo
- bar
```

The item-per-line form is also used for readability when elements are long. The parser treats the full line after the item marker as the element value.

### 5.3 Columnar Object Array

When elements are objects and all fields are pure, the array is encoded with an inline schema declaration followed by one `-` prefixed row per record. Fields are separated by `|`:

```
users[3]{id|name|role}:
- 1|Alice|admin
- 2|Bob|user
- 3|Carol|~
```

Absent fields emit `~`. Variadic fields are emitted as `key=value` extras after the positional fields (see Section 9).

### 5.4 Block Complex Array

When any field in the object array is itself an object array (requiring its own schema + rows), the parent array cannot be encoded columnar. Instead it uses block form: a `name[n]:` label followed by block records, one per item. Each record's first field is on the same line as the item marker (`- `). Continuation lines align with the content after `- ` (i.e. at `depth + 2` spaces):

```
departments[3]:
- name=Engineering
  budget: amount=500000|currency=USD
  teams[2]{name|members[]}:
  - Backend|[Alice|Bob|Carol]
  - Frontend|[Dave|Eve]
- name=Marketing
  budget: amount=10000|currency=EUR
  teams[1]{name|members[]}:
  - Growth|[Dave|Eve|Frank]
```

### 5.5 Mixed Arrays

When array elements are not all the same type (primitives mixed with objects or arrays), each element is encoded individually on its own line. Pure objects encode inline as `k=v|k=v`. Complex objects expand as a block with continuation lines aligned after the item marker:

```
items[3]:
- 1
- a=hello|b=world
- text value
```

Complex object element:

```
items[2]:
- 42
- name=Widget
  tags[2]: core|api
```

### 5.6 Nested Arrays and Objects in Columnar Rows

Schema fields may themselves declare arrays or objects. These are encoded inline within the row using `[...]` for arrays and `{...}` for objects:

```
teams[2]{name|members[]|coordinates[2]|scores[]}:
- Backend|[Alice|Bob|Carol]|[10|20]|[95|87|92|88|91]
- Frontend|[Dave|Eve]|[30|40]|[85|90|88]
```

Nested object fields use `{v1|v2}` for their positional values:

```
projects[3]{id|title|lead{id|name}}:
- P1|API Gateway|{1|Alice}
- P2|Auth Service|{2|Bob}
- P3|UI Redesign|{3|Carol}
```

Nested object fields with array sub-fields:

```
prototypes[2]{id|name|specs{performance[3]|weight}}:
- X1|Project X|{[95%|98%|97%]|2.5kg}
- X2|Project Y|{[88%|92%|90%]|1.8kg}
```

### 5.7 Two-Dimensional Grid

A 2D grid is declared with two dimension annotations. Each `-` row encodes one outer row, with `|` separating column values:

```
performance_matrix[3][4]:
- 98.5|85.3|92.1|~
- 87.2|~|91.4|88.9
- 95|93.5|89.7|90.2
```

### 5.8 Higher-Dimensional Grids

Grids of three or more dimensions follow the same pattern. Each `-` row encodes one slice of the outermost dimension. Inner slices are wrapped in `[...]`:

```
sensor_grid[2][3][4]:
- [1|2|3|4]|[5|6|7|8]|[9|10|11|12]
- [13|14|15|16]|[17|18|19|20]|[21|22|23|24]
```

### 5.9 Grid of Objects

When the leaf elements of a grid are objects, a schema field list follows the dimension annotations:

```
quantum_states[3][2]{amplitude|phase|probability}:
- {0.5|0.2|0.25}|{0.3|0.8|0.15}
- {0.7|0.1|0.35}|{0.2|0.5|0.20}
- {0.4|0.6|0.30}|{0.1|0.3|0.10}
```

### 5.10 Variable-Length Arrays

When an array's length is not consistent across parent records, the dimension is declared as `[]` (no count):

```
tags[]: core|revenue|critical
```

In a schema field list, `field[]` means variable length; `field[n]` means all records have exactly `n` elements.

---

## 6. Schema Declarations

Schemas are only emitted for arrays. They appear inline at the field site, immediately before the data block.

### 6.1 Primitive Array Schema

```
name[n]:       ← fixed length, n elements
name[]:        ← variable length
```

### 6.2 Object Array Schema

```
name[n]{field1|field2|field3}:     ← fixed length, inline field list
name[]{field1|field2|field3}:      ← variable length, inline field list
```

### 6.3 Grid Schema

```
name[r][c]:                         ← 2D grid of primitives
name[d1][d2][d3]:                   ← 3D grid of primitives
name[r][c]{field1|field2}:          ← 2D grid of objects
```

### 6.4 Nested Field Types in Schema

Fields within a `{...}` list may themselves declare arrays or nested objects:

| Schema syntax          | Meaning |
|------------------------|---------|
| `field`                | Primitive field |
| `field[n]`             | Fixed-length primitive array field |
| `field[]`              | Variable-length primitive array field |
| `field{a\|b}`          | Pure nested object field with known keys |

### 6.5 Variadic Marker

Fields below `variadicMaxFrequency` are omitted from the schema. Their presence is signalled by `...` at the end of the field list:

```
users[3]{id|name|...}:
- 1|Alice
- 2|Bob
- 3|Carol|note=vip
```

---

## 7. Special Tokens

| Token | Context | Meaning |
|-------|---------|---------|
| `~`   | Any field value | Null / absent |

`~` is the only reserved data-side token. A field value that is literally the string `~` MUST be escaped as `\~`.

There is no optional field tier. A declared field is either present with a value, or absent with `~`. Rarely-present fields become variadic instead (see Section 9).

---

## 8. Escaping

The following escape sequences MUST be used when a value contains special characters:

| Sequence   | Meaning |
|------------|---------|
| `\\`       | Literal backslash |
| `\|`       | Literal pipe character |
| `\~`       | Literal tilde (when value is the string `~`) |
| `\n`       | Newline (LF) |
| `\r`       | Carriage return |
| `\t`       | Horizontal tab |
| `\v`       | Vertical tab |
| `\f`       | Form feed |
| `\0`       | Null byte |
| `\u2028`   | Unicode Line Separator |
| `\u2029`   | Unicode Paragraph Separator |

Backslash MUST be escaped before all other characters to prevent double-escaping. Decoders MUST error on unrecognized escape sequences in strict mode.

---

## 9. Variadic Fields

Encoders infer variadic fields from observed presence frequency across records.

**Presence frequency** for a field = (count of records where field is non-null and non-undefined) / (total record count). Null, undefined, and missing key are all treated as absent.

Variadic classification uses a **two-tier decision**:

**Tier 1 — Floor check:** If `frequency < variadicMaxFrequency` (default `0.2`), the field is always variadic regardless of key length.

**Tier 2 — Break-even formula:** For fields above the floor, the encoder computes whether emitting `key=value` only when present is cheaper than emitting `~` on every absent row. The break-even frequency is:

```
breakEven = 1 / (keyLength + 2)
```

If `frequency < breakEven`, the field is variadic — the null-emission cost exceeds the key=value cost.

| Key length | Break-even frequency |
|------------|---------------------|
| 1 char     | 0.33 |
| 2 chars    | 0.25 |
| 4 chars    | 0.17 |
| 8 chars    | 0.10 |

| Encoding decision | Condition |
|-------------------|-----------|
| Variadic          | `frequency < variadicMaxFrequency` OR `frequency < 1/(keyLength+2)` |
| Declared          | Otherwise — emits `~` when absent |

Variadic fields are signalled in the schema by `...` at the end of the field list. In data rows, variadic values appear as `key=value` extras after all positional fields:

```
users[4]{id|name|...}:
- 1|Alice
- 2|Bob
- 3|Carol|note=vip|tier=gold
- 4|Dave
```

---

## 10. Indentation

MOON uses one space per indent level. Indentation is structural — it encodes nesting depth.

```
company:
 name=Acme Corp             ← 1 level (field of company)
 departments[3]{name}:
  - Engineering             ← 2 levels (array record... wait, rows are at same level as schema)
```

Rows are emitted at the **same indent level** as their schema line. The `-` item marker is the visual delimiter — not extra indentation.

```
company:
 name=Acme Corp
 tags[3]: core|api|infra
 users[2]{id|name}:        ← schema at depth 1
 - 1|Alice                 ← row at depth 1
 - 2|Bob                   ← row at depth 1
```

Encoders MUST use exactly one space per level. Decoders MUST treat inconsistent indentation as a parse error in strict mode.

---

## 11. Compression Levels

Encoders support a `compression` option that controls the trade-off between token density and format familiarity.

| Level | Value | Description |
|-------|-------|-------------|
| High  | `"high"` | Default. Full MOON encoding — columnar arrays, inline `{v\|v}` and `[v\|v]`, compact grids. |
| Medium | `"medium"` | Columnar only for flat primitive fields. Nested object/array fields fall back to block complex. Grids use full schema declaration with nested rows. |
| Low | `"low"` | TOON-like. No columnar encoding — all object arrays use block complex form. Grids use full schema declaration with nested rows. Inline pure objects expand to block. |

**`compression: "high"` (default):**
```
teams[2]{name|members[]|coords[2]}:
- Backend|[Alice|Bob|Carol]|[10|20]
- Frontend|[Dave|Eve]|[30|40]
```

**`compression: "medium"` (nested fields → block):**
```
teams[2]:
- name=Backend
  members[3]: Alice|Bob|Carol
  coords[2]: 10|20
- name=Frontend
  members[2]: Dave|Eve
  coords[2]: 30|40
```

**`compression: "low"` (all object arrays → block):**
Same as medium, but also applies to flat columnar arrays.

Grid encoding under medium/low uses the full schema declaration but expands rows recursively:

```
sensor_grid[2][3][4]:
- [3][4]:
  - [4]: 1|2|3|4
  - [4]: 5|6|7|8
  - [4]: 9|10|11|12
- [3][4]:
  - [4]: 13|14|15|16
  - [4]: 17|18|19|20
  - [4]: 21|22|23|24
```

The compression level does not affect the decoder — all compression levels produce valid MOON that any compliant decoder can read.

---

## 12. Token Summary

| Token            | Role |
|------------------|------|
| `@key:value`     | Document-level directive |
| `# ...`          | Hint / comment line — ignored by decoder (when `@hint: #` declared) |
| `key=value`      | Primitive field in an object block |
| `key:`           | Nested object or array field label |
| `key: k1=v1\|k2=v2` | Inline pure object (all primitive values) |
| `[n]`            | Fixed-length array dimension in schema |
| `[]`             | Variable-length array dimension in schema |
| `{f1\|f2}`       | Object field list in schema |
| `\|`             | Value separator in rows, one-liner arrays, inline objects |
| `~`              | Null / absent |
| `-`              | Item row prefix in array data blocks |
| `...`            | Variadic field marker at end of schema field list |
| `[v1\|v2]`       | Inline array value within a columnar row |
| `{v1\|v2}`       | Inline object value within a columnar row |

---

## 13. Conformance

### 14.1 Encoder Requirements

Encoders MUST:

- Emit all applicable token directives at the top of the document.
- Emit `@hint` when hint lines are present in the document.
- Emit example directives (`@ex_*`) only when the corresponding encoding pattern appears in the document body.
- Encode objects as labeled `key:` blocks or `key=value` lines — never emit a schema for an object.
- Emit pure objects inline (`key: k1=v1|k2=v2`) when all values are primitive and no value contains `|`.
- Emit array schemas inline at the field site, immediately before the data block.
- Bake array length into the schema declaration (`[n]`); emit `[]` when length varies across parent records.
- Use one-liner form for primitive arrays whose elements contain no `|`.
- Use block form (one item per line) for primitive arrays with any element containing `|`.
- Use columnar form for object arrays whose fields are all pure.
- Use block complex form for object arrays with any impure field.
- Emit rows at the same indent level as their schema line.
- Emit `~` for declared schema fields with absent values.
- Omit variadic fields from the schema; emit them as `key=value` extras in data rows only when present.
- Escape `\`, `|`, `~`, `\n`, `\r`, `\t`, `\v`, `\f`, `\0`, `\u2028`, `\u2029` in string values.

### 14.2 Decoder Requirements

Decoders MUST:

- Parse all `@`-directives at the top of the document before parsing any data.
- Ignore all `@ex_*` directives — they are hints for model comprehension only.
- Ignore all lines whose first non-whitespace character matches the `@hint` prefix.
- Parse objects as `key:` blocks (recurse) or `key=value` lines (primitive).
- Parse inline pure objects (`key: k1=v1|k2=v2`) as objects, not arrays.
- Parse array data using the inline schema immediately preceding the data block.
- Resolve array record field values positionally according to the schema.
- Interpret `~` (or the `@null` override) as null/absent.
- Parse `key=value` extras in rows as variadic fields.
- Reconstruct multi-dimensional grids from dimension annotations and row data.

### 14.3 Strict Mode

Strict mode (default: enabled) enforces:

- Indentation is an exact multiple of one space.
- Declared array dimensions match the actual row and element counts.
- No blank lines inside array data blocks.
- No unrecognized escape sequences.
- `~` used only on declared (non-variadic) fields.
- `@hint` value is exactly 1 character.

---

## 14. Examples

### 14.1 Simple Flat Object

```
id=42
name=Alice
email=alice@acme.com
active=true
```

### 14.2 Named Object with Nested Structure

```
company:
 name=Acme Corp
 location: street=123 Main St|state=CA|zip=80301
 contact: email=info@acme.com|phone=+1 555 0100
```

### 14.3 One-Liner Primitive Arrays

```
tags[3]: core|revenue|critical
priorities[4]: auth|scaling|security|monitoring
```

### 14.4 Block Primitive Array

```
messages[3]:
- hello\|world
- foo
- bar
```

### 14.5 Columnar Object Array

```
users[3]{id|name|role}:
- 1|Alice|admin
- 2|Bob|user
- 3|Carol|~
```

### 14.6 Nested Arrays and Objects in Schema

```
teams[2]{name|members[]|coordinates[2]|scores[]}:
- Backend|[Alice|Bob|Carol]|[10|20]|[95|87|92|88|91]
- Frontend|[Dave|Eve]|[30|40]|[85|90|88]

projects[3]{id|title|lead{id|name}|tags[]}:
- P1|API Gateway|{1|Alice}|[auth|security]
- P2|Auth Service|{2|Bob}|[oauth|jwt]
- P3|UI Redesign|{3|Carol}|[frontend|react]
```

### 14.7 Nested Object with Array Sub-Field in Schema

```
prototypes[2]{id|name|specs{performance[3]|weight}}:
- X1|Project X|{[95%|98%|97%]|2.5kg}
- X2|Project Y|{[88%|92%|90%]|1.8kg}
```

### 14.8 Two-Dimensional Grid

```
performance_matrix[3][4]:
- 98.5|85.3|92.1|~
- 87.2|~|91.4|88.9
- 95|93.5|89.7|90.2
```

### 14.9 Three-Dimensional Grid

```
sensor_grid[2][3][4]:
- [1|2|3|4]|[5|6|7|8]|[9|10|11|12]
- [13|14|15|16]|[17|18|19|20]|[21|22|23|24]
```

### 14.10 Grid of Objects

```
quantum_states[3][2]{amplitude|phase|probability}:
- {0.5|0.2|0.25}|{0.3|0.8|0.15}
- {0.7|0.1|0.35}|{0.2|0.5|0.20}
- {0.4|0.6|0.30}|{0.1|0.3|0.10}
```

### 14.11 Variadic Fields

```
users[4]{id|name|...}:
- 1|Alice
- 2|Bob
- 3|Carol|note=vip|tier=gold
- 4|Dave
```

### 14.12 Block Complex Array

```
departments[3]:
- name=Engineering
  budget: amount=500000|currency=USD
  teams[2]{name|members[]}:
  - Backend|[Alice|Bob|Carol]
  - Frontend|[Dave|Eve]
- name=Marketing
  budget: amount=10000|currency=EUR
  teams[1]{name|members[]}:
  - Growth|[Dave|Eve|Frank]
```

### 14.13 Full Document with All Directives

```
@null: ~
@sep: |
@item: -
@hint: #
@ex_schema: u[3]{id|name}: - 1|Alice
@ex_nested: u[2]{val|obj{a|b}|arr[]}: - v|{x|y}|[a|b]
@ex_grid: m[2][3]: - 1|2|3
@ex_inline: a[2]:x|y o:a=b|c=d
@ex_variadic: u[3]{id|name|...}: - 1|Alice -- 3|Carol|x=v
# root document
company:
 name=Acme Corp
 location: street=123 Main St|state=CA|zip=80301
 departments[2]{name|budget{amount|currency}|tags[]}:
 - Engineering|{500000|USD}|[core|revenue|critical]
 - Marketing|{10000|EUR}|[external|brand]
 global_tags[3]: tech|startup|innovation
```

---

## Appendix A: Comparison with TOON

| Feature | TOON | MOON |
|---------|------|------|
| Field separator | `,` (default) | `\|` (default, configurable via `@sep`) |
| Null token | No | `~` (configurable via `@null`) |
| Object encoding | Schema header | `key:` blocks — no schema |
| Array encoding | Schema header | Inline schema at field site |
| Count line | Separate `[n]:` line | Baked into schema declaration |
| Array row prefix | Positional | `-` item marker (configurable via `@item`) |
| Record separator | Positional | None — `-` prefix per row |
| One-liner arrays | No | Yes — `field[n]: a\|b\|c` |
| Inline pure object | No | `key: k=v\|k=v` |
| Grids | No | `[d1][d2][d3]` dimension chains |
| Grid of objects | No | `[d1][d2]{fields}` |
| Nested arrays in schema | No | `field[n]`, `field[]` in `{...}` |
| Optional fields | No | Removed — declared or variadic |
| Variadic fields | No | `...` marker, `key=value` in data |
| Token directives | No | `@null`, `@sep`, `@item` — conditional, emitted only when needed |
| Comment / hint lines | No | `@hint` prefix character |
| Model comprehension hints | No | `@ex_*` example directives |
| Scope | Structured data | Data, prompts, instructions, context |

---

## Appendix B: Design Rationale

**Why no schema for objects?**
Objects are self-describing — keys are always present and carry their own meaning. A schema header for an object is pure ceremony. Only arrays require schemas because positional encoding loses the keys.

**Why `|` instead of `,`?**
Pipe characters appear far less frequently in natural text, domain data, and numeric values than commas. This reduces escaping requirements for real-world data.

**Why bake count into the schema rather than a separate count line?**
Fewer lines, less visual noise. The count is part of the schema declaration — separating it added ceremony without adding information. `teams[2]{...}:` reads as one unit: "two-element array of this schema."

**Why `-` as an item marker instead of `---`?**
`---` was verbose. `-` is the natural list marker, familiar from YAML and Markdown. It's sufficient as a row prefix — parsers know where rows begin from the indent level and item marker, not from a multi-character separator.

**Why `~` for null?**
`~` is the established null convention in YAML, which LLMs have seen extensively. It carries the right semantic weight with minimal token cost.

**Why inline array schemas at the field site?**
Co-locating the schema with its data makes every array self-contained. An LLM reading a document fragment doesn't need to scan backwards to find a top-level schema declaration — the schema is always immediately above the data it describes.

**Why no optional field tier?**
A field is either in the schema (declared, always present, `~` when absent) or not (variadic, emitted only when present). Two states, no middle tier. Removing `field?` eliminates a whole class of encoder/decoder complexity and makes the absence model unambiguous.

**Why `variadicMaxFrequency = 0.2`?**
A field present in fewer than 20% of records would litter 80%+ of rows with `~`. Emitting it as `key=value` only when present is strictly more token-efficient. 0.2 is the default floor; the break-even formula further catches long-key fields where the key=value cost exceeds the null-emission cost even above the floor.

**Why a two-tier variadic decision?**
The simple floor threshold (`f < 0.2`) is key-length-agnostic. A 1-character key like `x` at 25% frequency is cheaper to emit as `x=v` than `~` on 75% of rows — the break-even formula catches this. Conversely, a 16-character key at 15% frequency is correctly kept variadic by the floor alone. The two tiers together minimize total token cost across all key lengths.

**Why compression levels?**
Different use cases have different trade-offs between token density and format familiarity. `compression: "high"` maximizes density for structured data and reasoning models. `compression: "low"` produces TOON-like output that leverages pre-training familiarity for unstructured or untrusted data. The format is a dial, not a binary choice.

**Why `dimensions: [d1, d2, ...]` for grids?**
A single array of dimension sizes captures all grid shapes in one descriptor field. The serializer reads `dimensions.length` to know the nesting depth and emits the appropriate `[d1][d2]...[dn]` chain. This is simpler than a recursive `inner` pointer and easier for the schema emitter to walk.

**Why `isOneLiner` on primitive array descriptors?**
The encoder needs to decide between `field[n]: a|b|c` and the block form before emitting. Capturing this decision in the descriptor during analysis keeps the serializer simple — it reads `isOneLiner` and picks the form, no re-inspection of values required.

**Why `@hint` for comment lines?**
MOON is a model-facing format — annotations in a document are guidance for the reading model, not notes for human editors. `@hint` names this intent directly. The prefix character is configurable so authors can choose whatever character is least likely to appear in their data. Having no default means comment lines are only recognized when explicitly opted into — a document without `@hint` has no lines that are silently discarded.

**Why are token directives conditional?**
A flat object with no arrays or nulls has no need for `@null`, `@sep`, or `@item`. Emitting them unconditionally adds header noise that the model must parse without benefit. Conditional emission keeps the header minimal — a document only declares what it actually uses. A model reading `@sep: |` learns something; a model reading it when there are no separators in the document learns nothing and pays a token cost.

**Why `@ex_*` example directives?**
MOON's positional encoding requires models to track column→field mappings without training data on the format. Inline examples at the document header ground the model's interpretation of schemas, nested values, grids, and variadic extras — at the cost of a few header lines, paid once per document rather than once per array.

**Why are `@ex_*` directives conditional?**
Emitting examples for patterns that don't appear wastes tokens and may confuse the model with irrelevant syntax. The encoder detects which patterns are present during serialization and emits only the relevant hints.

---

## Appendix C: License

This specification is released under the **Apache License 2.0**.

Full license text: https://www.apache.org/licenses/LICENSE-2.0

Copyright 2026 MOON Contributors. All rights reserved.