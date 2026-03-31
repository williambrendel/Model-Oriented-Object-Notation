![MOON logo](assets/short-logo.svg)

# MOON Specification

## Model-Oriented Object Notation

> *Take TOON to the MOON*
> *Symbol:* {M}
> *Logo:* {M}□□N

**Version:** 0.1

**Status:** Working Draft

---

## Abstract

Model-Oriented Object Notation (MOON) is a line-oriented, indentation-based text format designed specifically for model input — data, prompts, instructions, and context alike. MOON separates schema from data: the schema declares field names, types, defaults, and optionality once; data rows encode values positionally. MOON extends TOON's core tabular insight with a richer type system (defaults, optionality, unknown-schema objects), pipe delimiters to reduce escaping, explicit record separators, and a consistent set of data-side tokens (`def`, `~`). Where TOON's efficiency is concentrated in uniform tabular arrays, MOON extends those gains to nested, non-uniform, and prompt-heavy structures. Think of it as taking TOON to the MOON.

---

## Table of Contents

1. [Terminology](#1-terminology)
2. [Data Model](#2-data-model)
3. [Schema Declaration](#3-schema-declaration)
4. [Data Encoding](#4-data-encoding)
5. [Special Tokens](#5-special-tokens)
6. [Record Separator](#6-record-separator)
7. [Escaping](#7-escaping)
8. [Simple Objects](#8-simple-objects)
9. [Unknown-Schema Objects](#9-unknown-schema-objects)
10. [Indentation](#10-indentation)
11. [Token Summary](#11-token-summary)
12. [Conformance](#12-conformance)
13. [Examples](#13-examples)
- [Appendix A: Comparison with TOON](#appendix-a-comparison-with-toon)
- [Appendix B: Design Rationale](#appendix-b-design-rationale)
- [Appendix C: License](#appendix-c-license)

---

## 1. Terminology

- **Schema**: The declaration block that describes field names, types, defaults, and optionality.
- **Data block**: The lines following a schema declaration that encode actual values.
- **Field**: A named slot in an object or array element.
- **Pure object**: An object whose field values are all primitives (no nested objects or arrays).
- **Record**: One top-level instance of the declared type.
- **Active delimiter**: `|` — the pipe character used to separate field values on a single line.
- **Indent unit**: Two spaces (default). One indent unit = one nesting level.
- **`def` token**: Data-side token meaning "use the declared default value."
- **`~` token**: Data-side token meaning "null / absent."

The key words MUST, MUST NOT, SHOULD, MAY follow RFC 2119.

---

## 2. Data Model

MOON models the following value types:

- **Primitive**: string, number, boolean, or null.
- **Object**: ordered mapping from string keys to values.
- **Array**: ordered sequence of values.

MOON is a superset of the JSON data model for encoding purposes. Null is represented by the `~` token in data and has no literal form in schema other than the `?` modifier.

---

## 3. Schema Declaration

### 3.1 Basic Form

A schema declaration opens with a type expression followed by `:` and a newline:

```
name[]{field1|field2|...}:
```

For a single top-level object (no array wrapper):

```
name{field1|field2|...}:
```

### 3.2 Field Separators

Fields within `{...}` MUST be separated by `|`.

### 3.3 Array Notation

| Syntax | Meaning |
|--------|---------|
| `[n]` | Fixed-length array; `n` is a non-negative integer. |
| `[]` | Variable-length array; length unknown at schema time. |
| `{}` | Object with unknown keys (freeform). |
| `[]` | Array with unknown element schema. |

### 3.4 Field Modifiers

Modifiers MUST appear after the field name and any type expression, in this order: type annotation first, then modifier.

| Syntax | Meaning |
|--------|---------|
| `field` | Required field. No default. Value MUST be explicit in data. |
| `field?` | Optional field. No default. Value MAY be `~` in data. |
| `field(def=value)` | Optional field with declared default. Value MAY be `def` in data. |
| `field{a\|b}` | Field whose value is a pure object with known keys. |
| `field{a\|b}?` | Optional pure object with known keys. |
| `field[]{a\|b}` | Array field with known element schema. |
| `field[]{a\|b}?` | Optional array field with known element schema. |
| `field{}` | Field whose value is an object with unknown keys. |
| `field[]` | Field whose value is an array with unknown schema. |

**Rule:** Modifiers (`?` or `(def=value)`) MUST come last, after any type annotation (`{...}` or `[...]{...}`).

### 3.5 Defaults and Optionality Contract

- `field(def=value)`: The field always has a value. In data, `def` means "use `value`". `~` is NOT valid.
- `field?`: The field may be absent. In data, `~` means "null/absent". `def` is NOT valid.
- `field`: Required. Neither `def` nor `~` are valid. An explicit value MUST be provided.

### 3.6 Nested Schema

Nested objects and arrays use newline + indent in the schema declaration, mirroring how data will be indented:

```
parent[]{
  name
  address{street|city|zip}?
  tags[]?
}:
```

Inline `{...}` is used for pure objects whose fields fit on one line. Multiline expansion is used for objects with nested arrays or objects of their own.

---

## 4. Data Encoding

### 4.1 Primitives

Primitive values are emitted as bare tokens. Strings require no quoting unless they contain the active delimiter `|` or a newline — in which case escaping applies (see §7).

### 4.2 Pure Objects (Known Schema, Same Line)

A pure object whose schema is declared inline is encoded as pipe-separated values on one line, in field declaration order:

Schema:
```
reporter{name|email|department?}
```

Data:
```
Alice|alice@acme.com|~
```

### 4.3 Nested Objects (Multiline Schema)

An object whose schema spans multiple lines in the declaration is encoded with a newline + one additional indent level in data. The indent level in data MIRRORS the indent level in the schema.

Schema:
```
incident{
  title
  location{building|floor(def=1)|room?}
  tags[]?
}:
```

Data:
```
Database outage
 HQ|3|~
~
```

### 4.4 Variable-Length Arrays

A variable-length array field is preceded by a `[n]:` count line in the data, where `n` is the actual runtime count. One item per line follows, indented one level deeper.

Schema:
```
users[]{id|name|role?}
```

Data:
```
[3]:
 1|Alice|Lead
 2|Bob|Dev
 3|Carol|~
```

### 4.5 Fixed-Length Arrays

When the schema declares a fixed length (`[n]`), the `[n]:` count line MUST be omitted from the data. The parser derives the count from the schema.

### 4.6 Absent Optional Fields

An optional field (`field?` or `field{...}?` or `field[]{...}?`) that is absent in a given record MUST be represented by `~` on its own line at the appropriate indent level.

---

## 5. Special Tokens

| Token | Valid on | Meaning |
|-------|----------|---------|
| `def` | `field(def=value)` fields only | Use the declared default value. |
| `~` | `field?` fields only | Null / absent. |

These tokens are reserved. A field value that is literally the string `def` or `~` MUST be escaped.

---

## 6. Record Separator

When a schema declares a variable-length array at the top level, individual records are separated by `---`. The separator MUST be indented to match the indent level of the records it separates.

```
groups[]{
  name
  members[]{id|name}
}:
Engineering
[2]:
 1|Alice
 2|Bob
---
Marketing
[1]:
 3|Carol
```

Nested arrays use an indented `---`:

```
[2]:
 Backend
 [2]:
  1|Alice
  2|Bob
 ---
 Frontend
 [1]:
  3|Carol
```

---

## 7. Escaping

The following escape sequences MUST be used when a value contains special characters:

| Sequence | Meaning |
|----------|---------|
| `\|` | Literal pipe character |
| `\n` | Newline within a value |
| `\\` | Literal backslash |

No other escape sequences are defined. Decoders MUST error on unrecognized escape sequences.

---

## 8. Simple Objects

**Rule:** A plain flat object — one whose values are all primitives and which requires no array wrapper — MUST NOT be preceded by a schema declaration. Declaring a schema header for a simple object is unnecessary overhead and SHOULD be avoided.

Encode it directly as newline-separated `key=value` lines:

```
id=1
name=Alice
email=alice@acme.com
active=true
```

**Rationale:** The schema header earns its cost when you have arrays, nesting, defaults, or optionality. For a single flat object it is pure ceremony. The `key=value` form is self-describing — an LLM reading it cold needs no preamble to understand the structure.

This form is the preferred encoding for:
- Ad-hoc objects with no predefined schema.
- Prompt metadata, configuration, or instruction blocks.
- Any flat object passed inline as part of a larger prompt.

It is NOT appropriate when:
- The object contains nested objects or arrays.
- The object is one element of a larger array (use a schema + `---` record separator instead).
- Fields have defaults or optionality that need to be declared.

---

## 9. Unknown-Schema Objects

A field declared as `field{}` (object with unknown keys) is encoded in data with:

1. The field name followed by `:` on its own line.
2. Indented `key=value` lines for each present key.

```
metadata:
 created_at=2026-03-28T10:00:00Z
 updated_at=2026-03-28T10:00:00Z
 version=2
```

**Rationale:** When keys are unknown, positional encoding is impossible. The field label anchors the block unambiguously. Pipe separation is not used because fields are freeform and variable in number.

If two consecutive unknown-schema objects appear in the same record, each MUST be labeled:

```
meta:
 source=ingest
 version=3
audit:
 created_by=system
 reviewed=false
```

---

## 10. Indentation

- The default indent unit is **two spaces**.
- Tabs MUST NOT be used for indentation.
- The indent level in data MUST mirror the indent level in the schema declaration. A field at schema depth 2 produces data at data depth 2.
- `---` record separators MUST be indented to match the items they separate.
- Decoders in strict mode MUST error if leading spaces are not a multiple of the indent unit.

---

## 11. Token Summary

### Schema-Side Tokens

| Token | Position | Meaning |
|-------|----------|---------|
| `{a\|b}` | After field name | Pure object with known fields |
| `[n]` | After field name | Fixed-length array |
| `[]` | After field name | Variable-length array |
| `{}` | After field name | Object with unknown keys |
| `?` | Last modifier | Optional, no default |
| `(def=value)` | Last modifier | Optional with default value |

### Data-Side Tokens

| Token | Meaning | Valid on |
|-------|---------|----------|
| `def` | Use declared default | `(def=value)` fields only |
| `~` | Null / absent | `?` fields only |
| `[n]:` | Runtime array count | Variable `[]` arrays only |
| `---` | Record separator | Top-level and nested arrays |
| `key=value` | Labeled field | Unknown-schema `{}` objects and simple flat objects |

---

## 12. Conformance

### 12.1 Encoder Requirements

Encoders MUST:
- Emit fields in schema declaration order.
- Emit `[n]:` before variable-length array data when the schema uses `[]`.
- Omit `[n]:` when the schema uses `[n]` (fixed length).
- Indent data to match schema nesting depth.
- Indent `---` to match the nesting level of the separated records.
- Escape `|`, `\n`, and `\` in string values.
- Emit `~` for absent `?` fields (never omit the line).
- Emit `def` or an explicit value for `(def=value)` fields (never emit `~`).
- Use `key=value` lines for `{}` (unknown-schema) objects, labeled with the field name.
- Emit simple flat objects as bare `key=value` lines with no schema header.

### 12.2 Decoder Requirements

Decoders MUST:
- Parse the schema declaration before parsing data.
- Resolve field values positionally for known-schema objects and arrays.
- Interpret `def` as "substitute the declared default value."
- Interpret `~` as null.
- Error if `~` appears on a required field or a `(def=value)` field.
- Error if `def` appears on a required field or a `?` field.
- In strict mode, error if the runtime row count does not match a declared `[n]`.
- Parse `key=value` blocks under labeled `{}` fields as freeform objects.
- Parse bare `key=value` documents (no schema header) as simple flat objects.

### 12.3 Strict Mode

Strict mode (default: enabled) enforces:
- Row counts match declared `[n]`.
- Indentation is an exact multiple of the indent unit.
- No blank lines inside array blocks.
- No unrecognized escape sequences.
- `def` and `~` used only on their valid field types.

---

## 13. Examples

### 13.1 Simple Flat Object (No Schema)

A plain object. No schema needed — just emit `key=value` lines directly.

```
id=42
name=Alice
email=alice@acme.com
active=true
```

### 13.2 Simple Uniform Array

```
users[]{id|name|role}:
1|Alice|admin
2|Bob|user
3|Carol|user
```

### 13.3 Variable-Length Array with Record Separator

```
groups[]{
  name
  users[]{id|name}
}:
Admin
[2]:
 1|Alice
 2|Bob
---
Guest
[3]:
 3|Charlie
 4|Dana
 5|Elise
```

### 13.4 Deeply Nested Teams with Multi-Level Separators

`---` is always indented to the level of the items it separates — never the parent container.

```
company{
  name
  departments[]{
    name
    teams[]{
      name
      members[]{id|name}
    }
  }
}:
Acme Corp
[2]:
 Engineering
  [2]:
   Backend
   [3]:
    1|Alice
    2|Bob
    3|Carol
   ---
   Frontend
   [2]:
    4|Dave
    5|Eve
 ---
 Marketing
  [1]:
   Growth
   [2]:
    6|Frank
    7|Grace
```

### 13.5 Nested Objects with Defaults and Optionals

```
company{
  name
  departments[]{
    name
    budget{amount(def=10000)|currency?}
    teams[]{
      name
      members[]{id|name|role?}
    }
  }
}:
Acme Corp
[3]:
 Engineering
  500000|USD
  [1]:
   Backend
   [3]:
    1|Alice|Lead
    2|Bob|~
    3|Carol|~
 ---
 Marketing
  def|EUR
  [1]:
   Growth
   [2]:
    4|Dave|Lead
    5|Eve|~
 ---
 Stealth
  def|~
  [1]:
   Skunkworks
   [2]:
    6|Frank|Lead
    7|Grace|~
```

### 13.6 Unknown-Schema Object

```
event{
  id
  title
  metadata{}
}:
EVT-001
System reboot
metadata:
 initiated_by=ops
 ticket=OPS-442
 approved=true
```

### 13.7 All Field States

Given schema `budget{amount(def=10000)|currency?}`:

| Data | Meaning |
|------|---------|
| `500000\|USD` | Both explicit |
| `def\|USD` | Amount uses default (10000), currency explicit |
| `500000\|~` | Amount explicit, currency absent |
| `def\|~` | Amount uses default, currency absent |

Note: `~\|~` is NOT valid — `amount` is a `(def=value)` field and cannot be null.

### 13.8 Full Incident Report

Covers every pattern: defaults, optionals, unknown-schema metadata, `def`, `~`, nested arrays, multi-record.

```
incident_report{
  id
  timestamp
  severity(def=medium)
  title
  description?
  reporter{name|email|department?}
  location{building|floor(def=1)|room?}?
  affected_systems[]{
    name
    status
    impact_score(def=0)
    owner{name|email?}
  }?
  resolution{
    status(def=open)
    assigned_to{name|email|team?}?
    eta?
    notes?
  }
  tags[]?
  metadata{}
}:
INC-001
2026-03-28T10:00:00Z
critical
Database outage
Primary DB unresponsive since 09:45
Alice|alice@acme.com|~
 HQ|3|Room 302
[2]:
 payments-db|down|9|Bob|bob@acme.com
 auth-service|degraded|def|Carol|~
open|Dave|dave@acme.com|SRE|2026-03-28T12:00:00Z|Investigating
[2]:
 database
 critical
metadata:
 created_at=2026-03-28T09:50:00Z
 updated_at=2026-03-28T10:00:00Z
 version=2
---
INC-002
2026-03-28T11:00:00Z
def
Login page slow
~
Bob|bob@acme.com|~
~
~
open|~|~|~
~
metadata:
 created_at=2026-03-28T11:00:00Z
 updated_at=2026-03-28T11:00:00Z
 version=1
```

---

## Appendix A: Comparison with TOON

| Feature | TOON | MOON |
|---------|------|------|
| Field separator | `,` (default) | `\|` (fixed) |
| Optional fields | Not in spec | `field?` |
| Default values | Not in spec | `field(def=value)` |
| `def` token | No | Yes |
| `~` null token | No | Yes |
| Unknown-schema objects | No | `field{}` |
| Record separator | Positional | `---` |
| Schema style | Single-line | Multiline GraphQL-style |
| Simple flat objects | Key-value object form | `key=value` per line, no schema |
| Scope | Structured data | Data, prompts, instructions, context |

MOON is a strict superset of TOON's core data encoding pattern, extended with a type system designed for LLM reliability. *Take TOON to the MOON.*

---

## Appendix B: Design Rationale

**Why `|` instead of `,`?**
Pipe characters appear far less frequently in natural text, domain data, and numeric values than commas. This reduces escaping requirements for real-world data.

**Why `def` instead of a symbol?**
Empirical testing showed that LLMs reliably connect the keyword `def` in data back to `(def=value)` in the schema. Symbols (`*`, `_`, `*`) failed to trigger this association reliably.

**Why `~` for null?**
`~` is the established null convention in YAML, which LLMs have seen extensively. It carries the right semantic weight with minimal token cost.

**Why `---` for record separators?**
`---` is an unambiguous horizontal rule with no other role in the format. Single `-` risks confusion with list markers or negative numbers. `---` also carries existing mental weight from YAML and Markdown.

**Why mirror schema indent in data?**
Indent level as a structural signal is reliable when it is derived from an explicit schema the LLM has already parsed. The schema provides the key, the data provides the values; their structure matches.

**Why `(def=value)` syntax?**
Parentheses visually separate the annotation from the field name and type. An LLM encountering `amount(def=10000)` reads it as "field `amount`, metadata: default is 10000" — the annotation is clearly subordinate to the field, not part of the type expression.

**Why no schema for simple flat objects?**
The schema header earns its cost when you have arrays, nesting, defaults, or optionality. For a single flat object it is pure ceremony. The `key=value` form is self-describing and an LLM needs no preamble to parse it reliably.

---

## Appendix C: License

This specification is released under the **Apache License 2.0**.

You are free to use, modify, distribute, and implement this specification in any product or project — commercial or otherwise — without royalty or restriction. Any use of this specification or derivative works thereof includes an express grant of patent rights from contributors to users, ensuring the format remains free and unencumbered for the entire community.

Full license text: https://www.apache.org/licenses/LICENSE-2.0

Copyright 2026 MOON Contributors. All rights reserved.