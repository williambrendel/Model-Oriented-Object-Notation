![MOON logo](assets/full-logo.svg)

# MOON
### Model-Oriented Object Notation

> *Take TOON to the MOON*

**{M}** &nbsp;|&nbsp; Compact &nbsp;|&nbsp; Schema-first &nbsp;|&nbsp; LLM-native &nbsp;|&nbsp; Apache 2.0

---

## What is MOON?

MOON is a text format designed for one purpose: sending structured data to language models as efficiently and reliably as possible.

If you've used [TOON](https://github.com/toon-format/toon), MOON picks up where it left off. TOON is excellent for uniform tabular arrays. MOON extends that with objects, grids, variadic fields, and inline nested schemas — so it works equally well for messy real-world data and for prompts, instructions, and context blocks.

If you haven't used TOON, think of MOON as JSON with the ceremony stripped out, a schema that doubles as documentation, and a format an LLM will parse reliably on the first try.

---

## Why not just use JSON?

JSON was built for machines talking to machines. Every key is repeated on every object. Every string is quoted. Every brace, bracket, and comma costs tokens.

```json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob",   "role": "user"  }
  ]
}
```

MOON declares the structure once, then streams the values:

```
users[2]{id|name|role}:
- 1|Alice|admin
- 2|Bob|user
```

Same information. Fewer tokens. The model knows exactly what to expect before it reads a single value.

---

## The core idea

MOON separates **schema** from **data** — but only for arrays.

Objects are self-describing: `key=value` lines carry their own meaning. No schema needed.

Arrays lose their keys in positional encoding. MOON declares the schema inline at the field site, immediately above the data:

```
teams[2]{name|members[]|scores[]}:
- Backend|[Alice|Bob|Carol]|[95|87|92|88|91]
- Frontend|[Dave|Eve]|[85|90|88]
```

A few things to notice:

- `[2]` = fixed length; `[]` = variable length
- `|` separates fields and values — chosen because it rarely appears in real data
- `[v|v|v]` encodes inline arrays; `{v|v}` encodes inline objects within rows
- All lengths are declared inline — no separate count lines

---

## Objects need no schema

Flat objects are written as `key=value` lines — no header, no schema:

```
id=42
name=Alice
email=alice@acme.com
active=true
```

Pure nested objects collapse to one line:

```
budget: amount=500000|currency=USD
location: street=123 Main St|state=CA|zip=80301
```

Complex nested objects expand as indented blocks:

```
company:
 name=Acme Corp
 founded=2018
 address:
  city=Boulder
  state=CO
```

This is the preferred form for prompt metadata, configuration, and instruction context.

---

## Null and absent values

`~` is the null token. It appears in declared schema fields when a value is absent:

```
users[3]{id|name|role}:
- 1|Alice|admin
- 2|Bob|~
- 3|Carol|user
```

A field that is rarely present doesn't need to litter rows with `~`. MOON infers **variadic fields** automatically — fields below a presence frequency threshold are omitted from the schema and emitted inline only when present:

```
users[4]{id|name|...}:
- 1|Alice
- 2|Bob
- 3|Carol|note=vip|tier=gold
- 4|Dave
```

The `...` signals that additional fields may appear as `key=value` extras.

---

## Grids and multi-dimensional arrays

Grids are declared with chained dimension annotations:

```
performance_matrix[3][4]:
- 98.5|85.3|92.1|~
- 87.2|~|91.4|88.9
- 95|93.5|89.7|90.2

sensor_grid[2][3][4]:
- [1|2|3|4]|[5|6|7|8]|[9|10|11|12]
- [13|14|15|16]|[17|18|19|20]|[21|22|23|24]

quantum_states[3][2]{amplitude|phase|probability}:
- {0.5|0.2|0.25}|{0.3|0.8|0.15}
- {0.7|0.1|0.35}|{0.2|0.5|0.20}
- {0.4|0.6|0.30}|{0.1|0.3|0.10}
```

---

## Document directives

MOON documents open with conditional directives — emitted only when the corresponding pattern appears in the body:

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
```

Token directives (`@null`, `@sep`, `@item`) declare active encoding tokens. A flat object with no arrays or nulls emits no directives at all.

Example directives (`@ex_*`) are inline decoding hints for model comprehension — one-liner examples showing each encoding pattern that appears in the document. The decoder ignores them; the model uses them to ground its interpretation.

`@hint` declares a comment prefix. Lines starting with that character are ignored by the decoder:

```
@hint: #
# This section covers Engineering department data
departments[3]:
...
```

---

## Compression levels

MOON supports three compression levels via the `compression` option:

| Level | Value | Description |
|-------|-------|-------------|
| High | `"high"` | Default. Full MOON — columnar arrays, inline `{v\|v}` and `[v\|v]`, compact grids. |
| Medium | `"medium"` | Columnar only for flat primitive fields. Nested fields expand to block form. |
| Low | `"low"` | TOON-like. All object arrays expand to block form. Familiar syntax for unstructured data. |

**High (default):**
```
teams[2]{name|members[]|coords[2]}:
- Backend|[Alice|Bob|Carol]|[10|20]
- Frontend|[Dave|Eve]|[30|40]
```

**Low:**
```
teams[2]:
- name=Backend
  members[3]: Alice|Bob|Carol
  coords[2]: 10|20
- name=Frontend
  members[2]: Dave|Eve
  coords[2]: 30|40
```

All compression levels produce valid MOON that any compliant decoder can read.

---

## Not just data

MOON works for anything you send to a model:

- Structured datasets and database exports
- Prompt templates with typed slots
- Instruction blocks with metadata
- RAG context windows with mixed content
- Multi-dimensional sensor and metrics data

Wherever you're currently using JSON in a prompt, MOON will be smaller, cleaner, and more reliable.

---

## How it compares

| Feature | JSON | TOON | MOON |
|---------|------|------|------|
| Token efficient | No | Yes | Yes |
| Schema declaration | No | Header-only | Inline at field site |
| Object encoding | Verbose | Header required | `key=value`, no schema |
| Null token | `null` (4 tokens) | No | `~` (1 token) |
| Variadic fields | No | No | `...` marker, auto-inferred |
| Grids / N-D arrays | Nested arrays | No | `[d1][d2][d3]` chains |
| Inline nested values | No | No | `{v\|v}` and `[v\|v]` in rows |
| Compression control | No | No | `high` / `medium` / `low` |
| Model comprehension hints | No | No | `@ex_*` directives |
| Comment lines | No | No | `@hint` prefix |
| Conditional directives | No | No | Only emit what's needed |
| LLM-native | No | Yes | Yes |

---

## Quick reference

### Array schema syntax

```
name[n]{field1|field2}:       fixed-length columnar array
name[]{field1|field2}:        variable-length columnar array
name[n]:                       fixed-length primitive or block array
name[r][c]:                    2D grid of primitives
name[r][c]{field1|field2}:    2D grid of objects
field[n]                       fixed-length array field in schema
field[]                        variable-length array field in schema
field{a|b}                     nested object field in schema
...                            variadic marker — extra fields may follow
```

### Object encoding

```
key=value                      primitive field
key=~                          null / absent field
key: k1=v1|k2=v2               inline pure object (all primitive values)
key:                           block object (nested arrays or objects)
```

### Data tokens

```
~                              null / absent
-                              item row prefix
|                              field separator
[v1|v2|v3]                    inline array value within a row
{v1|v2|v3}                    inline object value within a row
key=value                      variadic extra in a row
```

### Directives

```
@null: ~                       null marker (emitted when ~ appears in body)
@sep: |                        field separator (emitted when | used)
@item: -                       row prefix (emitted when - rows present)
@hint: #                       comment prefix (emitted when hints present)
@ex_schema: ...                flat columnar example
@ex_nested: ...                nested schema example
@ex_grid: ...                  grid example
@ex_inline: ...                inline value shapes example
@ex_variadic: ...              variadic fields example
```

### Escaping

```
\\                             literal backslash
\|                             literal pipe
\~                             literal tilde
\n  \r  \t                     whitespace
```

---

## Full example

```
@null: ~
@sep: |
@item: -
@hint: #
@ex_schema: u[3]{id|name}: - 1|Alice
@ex_nested: u[2]{val|obj{a|b}|arr[]}: - v|{x|y}|[a|b]
@ex_grid: m[2][3]: - 1|2|3
@ex_variadic: u[3]{id|name|...}: - 1|Alice -- 3|Carol|x=v
# company dataset
company:
 name=Acme Corp
 location: street=123 Main St|state=CA|zip=80301
 departments[3]:
 - name=Engineering
   budget: amount=500000|currency=USD
   teams[2]{name|members[]|scores[]}:
   - Backend|[Alice|Bob|Carol]|[95|87|92]
   - Frontend|[Dave|Eve]|[85|90|88]
   projects[2]{id|title|lead{id|name}|tags[]}:
   - P1|API Gateway|{1|Alice}|[auth|security]
   - P2|Auth Service|{2|Bob}|[oauth|jwt]
 - name=Marketing
   budget: amount=10000|currency=EUR
   tags[2]: external|brand
 - name=Stealth
   budget: amount=10000|currency=~
   access_levels[2]: 5|~
 global_tags[3]: tech|startup|innovation
```

---

## Specification

The full MOON specification is in [`SPEC.md`](./SPEC.md). It covers:

- Complete encoding rules for all value types
- Schema declaration syntax
- Variadic field inference (two-tier frequency formula)
- Compression level behavior
- Directive emission rules
- Escaping requirements
- Encoder and decoder conformance checklists
- Strict mode validation rules
- Full examples including grids, nested schemas, and variadic fields
- Comparison with TOON
- Design rationale

---

## License

Apache 2.0 — free to use, implement, and build on commercially.

See [`LICENSE`](./LICENSE) for the full text.

---

> {M}□□N &nbsp;·&nbsp; *Take TOON to the MOON*