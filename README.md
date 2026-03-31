![MOON logo](assets/full-logo.svg)

# {M}□□N
### Model-Oriented Object Notation

> *Take TOON to the MOON*

**{M}** &nbsp;|&nbsp; Compact &nbsp;|&nbsp; Schema-first &nbsp;|&nbsp; LLM-native &nbsp;|&nbsp; Apache 2.0

---

## What is MOON?

MOON is a text format designed for one purpose: sending structured data to language models as efficiently and reliably as possible.

If you've used [TOON](https://github.com/toon-format/toon), MOON picks up where it left off. TOON is excellent for uniform tabular arrays. MOON extends that with a richer type system — defaults, optionals, nested structures, and unknown-schema objects — so it works equally well for messy, real-world data and for prompts, instructions, and context blocks.

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
users[]{id|name|role}:
1|Alice|admin
2|Bob|user
```

Same information. Fewer tokens. And the model knows exactly what to expect before it reads a single value.

---

## The core idea

MOON separates **schema** from **data**.

The schema declares the shape — field names, types, defaults, optionality — once at the top. The data rows carry only values, positionally, in the order the schema declared them.

```
groups[]{
  name
  members[]{id|name|role?}
}:
Engineering
[3]:
 1|Alice|Lead
 2|Bob|Dev
 3|Carol|~
---
Marketing
[2]:
 4|Dave|Lead
 5|Eve|~
```

A few things to notice:

- `[]` means variable-length array; `[3]:` in the data gives the runtime count
- `|` separates fields — chosen because it rarely appears in real data
- `role?` means optional; `~` in data means null/absent
- `---` separates records at the same nesting level
- Indent level in data mirrors indent level in the schema

---

## Defaults

Declare a default value in the schema with `(def=value)`. In the data, write `def` to use it — no need to repeat the value.

```
budget{amount(def=10000)|currency?}
```

| Data | Meaning |
|------|---------|
| `500000\|USD` | Both explicit |
| `def\|USD` | Amount uses default (10000), currency explicit |
| `500000\|~` | Amount explicit, currency null |
| `def\|~` | Amount uses default, currency null |

The LLM sees `def` and knows to look up the declared default. No ambiguity, no hallucination.

---

## Simple objects need no schema

If your object is flat — all primitive values, no arrays, no nesting — just write it:

```
id=42
name=Alice
email=alice@acme.com
active=true
```

No header. No ceremony. The `key=value` form is self-describing. An LLM reads it instantly.

This is the preferred form for prompt metadata, configuration blocks, and instruction context.

---

## Unknown-schema objects

Sometimes you don't know the keys in advance — freeform metadata, dynamic attributes, user-defined fields. Declare the field as `{}` in the schema, then label it in the data:

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

The label anchors the block. The LLM knows where it starts and where it ends.

---

## Not just data

MOON works for anything you send to a model:

- Structured datasets
- Prompt templates with typed slots
- Instruction blocks with metadata
- Context windows with mixed content

Wherever you're currently using JSON in a prompt, MOON will be smaller, cleaner, and more reliable.

---

## How it compares

| Feature | JSON | TOON | MOON |
|---------|------|------|------|
| Token efficient | No | Yes | Yes |
| Schema declaration | No | Inline | Multiline GraphQL-style |
| Optional fields | No | No | `field?` |
| Default values | No | No | `field(def=value)` |
| Null token | `null` | No | `~` |
| Default token | — | — | `def` |
| Record separator | — | Positional | `---` |
| Unknown-schema objects | Yes | No | `field{}` |
| Simple flat objects | Verbose | Header required | `key=value`, no header |
| LLM-native | No | Yes | Yes |

---

## Quick reference

### Schema syntax

```
name[]{field1|field2}:         variable array, known schema
name[3]{field1|field2}:        fixed array (3 items), known schema
name{field1|field2}:           single object, known schema
field?                         optional, no default
field(def=value)               optional, with default
field{}                        object, unknown keys
field[]                        array, unknown schema
```

### Data tokens

```
def        use the declared default value
~          null / absent
[n]:       runtime count for variable arrays
---        record separator (indented to match record level)
key=value  labeled field for unknown-schema objects and simple flat objects
```

### Escaping

```
\|         literal pipe
\n         newline in a value
\\         literal backslash
```

---

## Full example

```
incident_report{
  id
  severity(def=medium)
  title
  description?
  reporter{name|email}
  affected_systems[]{name|status}?
  tags[]?
  metadata{}
}:
INC-001
critical
Database outage
Primary DB unresponsive since 09:45
Alice|alice@acme.com
[2]:
 payments-db|down
 auth-service|degraded
[2]:
 database
 critical
metadata:
 created_at=2026-03-28T10:00:00Z
 version=2
---
INC-002
def
Login page slow
~
Bob|bob@acme.com
~
~
metadata:
 created_at=2026-03-28T11:00:00Z
 version=1
```

---

## Specification

The full MOON specification is in [`SPEC.md`](./SPEC.md). It covers:

- Complete schema syntax and field modifier rules
- Data encoding rules for all types
- Special token contracts (`def`, `~`)
- Record separator indentation rules
- Escaping requirements
- Encoder and decoder conformance checklists
- Strict mode validation rules
- Full examples including edge cases
- Comparison with TOON
- Design rationale

---

## License

Apache 2.0 — free to use, implement, and build on commercially. Contributors grant an express patent license, keeping MOON free and unencumbered for the entire community.

See [`LICENSE`](./LICENSE) for the full text.

---

> {M}□□N &nbsp;·&nbsp; *Take TOON to the MOON*