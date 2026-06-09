# dryvjs — Developer Architecture Guide

This document describes the internal proxy layers and class hierarchy of the `dryvjs` core package.

## Overview

`dryvjs` provides reactive, model-driven validation by wrapping plain JavaScript objects in layered proxies. Each layer has a single responsibility:

1. **Layer 1** — Change detection (observable proxies)
2. **Layer 2** — Developer-facing facade proxies
3. **Layer 3** — Edge-case type wrapping

Validators form a tree that mirrors the model's shape. The validation session orchestrates rule execution across the tree.

---

## Proxy Layers

### Layer 1 — Observable Proxy (Change Detection)

| File | Purpose |
|------|---------|
| `src/internal/observableProxy.ts` | Intercepts `set` on object properties, emits `FieldEvent` |
| `src/internal/observableArrayProxy.ts` | Intercepts `push`/`pop`/`splice`/`shift`/`unshift`/index on arrays, emits `ArrayEvent` |

These proxies are **internal only**. They wrap the raw model and notify validators when a field value changes or an array mutates. The `set` trap skips properties prefixed with `_` or `$` (internal/meta fields).

**Lifecycle management** is handled by `src/internal/proxyLifecycle.ts` (`createProxyLifecycle`), which encapsulates registration/unregistration of event handlers and provides a `destroy()` method for cleanup.

### Layer 2 — Facade Proxy (Developer API)

| File | Purpose |
|------|---------|
| `src/internal/createObjectFacade.ts` | Proxy over `DryvObjectValidator` exposing `DryvValidatableObject<T>` |
| `src/internal/createArrayFacade.ts` | Proxy over `DryvArrayValidator` exposing `DryvValidatableArray<T>` |

These are what consumers interact with. Property access on the facade is routed:

- **Object facade**: `get` returns child validator facades (nested objects) or field validators (scalars). `set` delegates to `validator.value = ...` so it flows through Layer 1.
- **Array facade**: Index access returns child validator facades. Non-numeric property access (e.g. `push`) is forwarded to the underlying observable array proxy.

Both facades expose `$validator` to allow escape-hatch access to the underlying validator instance.

### Layer 3 — SpecialTypeWrapper (Edge-Case Handling)

| File | Purpose |
|------|---------|
| `src/internal/SpecialTypeWrapper.ts` | Wraps built-in types that break under Proxy traps |

Types like `File`, `ArrayBuffer`, `Promise`, `Error`, typed arrays, and WebAssembly objects throw or misbehave when accessed through proxy traps. `SpecialTypeWrapper.wrap()` detects these types and returns a plain-object proxy that delegates property access explicitly, preventing Layer 1 from interfering.

---

## Class Hierarchy

```
DryvValidator<TModel, TValue>          (abstract base)
├── DryvFieldValidator<TModel>         (leaf — scalar fields)
└── DryvCompositeValidator<TModel, TProxy, TEvent>  (shared lifecycle base)
    ├── DryvObjectValidator<TModel>    (composite — nested objects)
    └── DryvArrayValidator<TModel>     (composite — arrays)
```

### `DryvValidator<TModel, TValue>` — Abstract Base

**Location:** `src/validators/DryvValidator.ts`

Provides:
- **Reactive state** (`_reactive: DryvReactiveState`): `text`, `type`, `group`, `required`, `isDirty`, `groupShown` — wrapped via `options.reactiveWrapper` for framework integration (e.g. Vue `reactive()`). The reactive state is held directly (no intermediate class).
- **Tree traversal**: `parent`, `childValidators()`, `rootModel`, `rootValidator`.
- **Tree attachment**: `attachToTree(parent)` — performs hierarchy setup (path computation, `onParentChanged`). The `parent` setter is inert (stores reference only).
- **Path computation**: `path` and `uniquePath` (dot-notation addressing used for rule lookup).
- **Lifecycle**: `destroy()`, `revert()`, `commit()`, `clear()`.
- **Facade accessor**: `facadeProxy` — set by subclasses to their Layer 2 proxy.
- **Server result mapping**: `setValidationResult(response)` — uses a type guard (`isStructuredResponse`) instead of unsafe casts.

### `DryvCompositeValidator<TModel, TProxy, TEvent>` — Shared Lifecycle Base

**Location:** `src/validators/DryvCompositeValidator.ts`

Abstract base for validators that own a `ProxyLifecycle`. Provides:
- `lifecycle?: ProxyLifecycle<TProxy, TEvent>` — the current lifecycle instance.
- `proxy: TProxy` — the current observable proxy.
- `replaceProxy(factory)` — destroys the old lifecycle, creates a new one, assigns `proxy`.
- `onDestroy()` — calls `lifecycle?.destroy()`.

### `DryvFieldValidator<TModel>` — Leaf Validator

**Location:** `src/validators/DryvFieldValidator.ts`

- Represents a single scalar field on the model.
- `value` reads/writes directly to `model[field]` (which is the Layer 1 observable proxy).
- Tracks `_initialValue` for dirty detection and revert.
- `childValidators()` returns `[]` (leaf node).

### `DryvObjectValidator<TModel>` — Composite (Object)

**Location:** `src/validators/DryvObjectValidator.ts`

- Extends `DryvCompositeValidator`.
- Creates a Layer 1 observable proxy for the model (`createObservableProxy`) via `replaceProxy()`.
- Creates a Layer 2 facade proxy (`createObjectFacade`).
- Maintains `fields: Record<string, DryvValidator>` — one child validator per model property.
- On model mutation (Layer 1 event), re-creates the child validator for the changed field and triggers `refreshDirty()` + `validate()`.
- On full model replacement (`set value()`), tears down all children and rebuilds.

### `DryvArrayValidator<TModel>` — Composite (Array)

**Location:** `src/validators/DryvArrayValidator.ts`

- Extends `DryvCompositeValidator`.
- Creates a Layer 1 observable array proxy (`createObservableArrayProxy`), with `SpecialTypeWrapper.wrap()` applied, via `replaceProxy()`.
- Creates a Layer 2 facade proxy (`createArrayFacade`).
- Maintains `_items: DryvValidator[]` — one child validator per array element.
- Handles `ArrayEvent`s (`append`, `insert`, `remove`, `replace`) to add/remove child validators.

---

## Validation Session & Rule Context

### `DryvValidationSession`

**Location:** `src/session/DryvValidationSession.ts`

The session is the orchestrator:

- Holds the `DryvValidationRuleSet` (rules + disablers per field path).
- Creates a `DryvRuleContext` instance passed to rule `validate()` calls.
- `validateObject()` — validates the object validator itself + all children in parallel.
- `validateField()` — runs disablers first, then validators for a single field. Mutations (`field.type`, `field.text`, `field.group`) are performed explicitly at the call site.
- Tracks `_processedFields` to avoid duplicate validation within a single chain.
- Supports `validationTrigger` modes: `auto`, `manual`, `autoAfterManual`.

### `DryvRuleContext`

**Location:** `src/session/DryvRuleContext.ts`

A minimal interface passed to rule `validate` functions. Decouples rules from the session:

- `callServer(url, method, data)` — delegates to `options.callServer`.
- `parseDate(date, locale, format)` — delegates to `options.parseDate`.
- `format(data, type, pattern?)` — delegates to `options.format`.
- `parameter(key)` — reads from `ruleSet.parameters`.

---

## Validator Factory

**Location:** `src/validators/createValidator.ts`

`createChildValidator(parent, value, model, field, session, options)` decides which validator to instantiate using a direct `if/else` chain:

| Value type | Validator created |
|------------|-------------------|
| `function` | `null` (skipped — early return) |
| `Array` or special type (`File`, `Blob`, etc.) | `DryvFieldValidator` (array handling is via `DryvArrayValidator` at the parent level) |
| Plain `object` | `DryvObjectValidator` (recursive) |
| Primitive | `DryvFieldValidator` |

---

## Data Flow Summary

```
User mutates model property
        │
        ▼
Layer 1: Observable Proxy fires FieldEvent / ArrayEvent
        │
        ▼
Validator receives event → refreshDirty() → validate()
        │
        ▼
Session looks up rules by validator.path → runs disablers → runs validators
        │
        ▼
Result applied: validator.text / validator.type updated (reactive)
        │
        ▼
Layer 2: Facade Proxy exposes updated state to consumer
```

---

## Directory Layout

```
src/
├── config/              # DryvOptions defaults, builder, rule set resolution
├── internal/            # Proxy layers (Layers 1–3), path computation, facade utilities
│   └── facadeUtils.ts   # Shared VALIDATOR_KEY constant and resolveFacade() helper
├── session/             # Validation session, rule context, rule runners, result aggregation
│   └── DryvRuleContext.ts  # Minimal context passed to rule validate() functions
├── types/               # Public TypeScript interfaces and type maps
│   └── reactiveState.ts # DryvReactiveState interface (public shape for framework integrations)
├── validators/          # Validator class hierarchy and factory
│   └── DryvCompositeValidator.ts  # Shared lifecycle base for Object/Array validators
├── getDryvModel.ts      # Utility: extract raw model from facade
├── getDryvValidator.ts  # Utility: extract validator from facade
└── index.ts             # Public re-exports
```
