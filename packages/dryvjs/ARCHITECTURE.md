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

**Event infrastructure**: `src/internal/ProxyEventEmitter.ts` provides a generic `ProxyEventEmitter<TEvent>` base class with `register()`, `unregister()`, and `fire()` methods, used by both observable proxy types.

**Lifecycle management** is handled by `src/internal/proxyLifecycle.ts` (`createProxyLifecycle`), which encapsulates registration/unregistration of event handlers and provides a `destroy()` method for cleanup.

### Layer 2 — Facade Proxy (Developer API)

| File | Purpose |
|------|---------|
| `src/internal/createObjectFacade.ts` | Proxy over `DryvObjectValidator` exposing `DryvValidatableObject<T>` |
| `src/internal/createArrayFacade.ts` | Proxy over `DryvArrayValidator` exposing `DryvValidatableArray<T>` |

These are what consumers interact with. Property access on the facade is routed:

- **Object facade**: `get` returns child validator facades (nested objects) or field validators (scalars). `set` delegates to `validator.value = ...` so it flows through Layer 1.
- **Array facade**: Index access returns child validator facades. Non-numeric property access (e.g. `push`) is forwarded to the underlying observable array proxy.

Both facades expose `$validator` to allow escape-hatch access to the underlying validator instance. Shared constants (`VALIDATOR_KEY`) and the `resolveFacade()` helper live in `src/internal/facadeUtils.ts`.

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
- **Reactive state** (`reactive: DryvReactiveState`): `text`, `type`, `group`, `required`, `isDirty`, `groupShown`, `path`, `uniquePath` — wrapped via `options.reactiveWrapper` for framework integration (e.g. Vue `reactive()`). The reactive state is held directly (no intermediate class).
- **Tree traversal**: `parent`, `childValidators()`, `rootModel`, `rootValidator`.
- **Tree attachment**: `attachToTree(parent)` — performs hierarchy setup (path computation via `computeHierarchy()`, `onParentChanged`). The `parent` setter is inert (stores reference only).
- **Path computation**: `path` and `uniquePath` (dot-notation addressing used for rule lookup). Delegated to `computeHierarchy()` in `validatorTree.ts`, which in turn calls `computeValidatorPaths()` in `internal/computeValidatorPaths.ts`.
- **Lifecycle**: `destroy()` / `dispose()` (with `Symbol.dispose` support), `revert()`, `commit()`, `clear()`.
- **Facade accessor**: `facadeProxy` — set by subclasses to their Layer 2 proxy.
- **Server result mapping**: `setValidationResult(response)` — delegates to `applyServerValidationResult()` in `serverResultMapper.ts`.
- **State reset**: `clear()` and `resetState()` delegate to `resetValidatorState()` and `walkValidatorTree()` in `validatorLifecycle.ts`.
- **Serialization**: `toJSON()` delegates to `serializeValidator()` in `serializeValidator.ts`.

### `DryvCompositeValidator<TModel, TProxy, TEvent>` — Shared Lifecycle Base

**Location:** `src/validators/DryvCompositeValidator.ts`

Abstract base for validators that own a `ProxyLifecycle`. Provides:
- `lifecycle?: ProxyLifecycle<TProxy, TEvent>` — the current lifecycle instance.
- `proxy: TProxy` — the current observable proxy.
- `replaceProxy(factory)` — destroys the old lifecycle, creates a new one, assigns `proxy`.
- `createFacade()` — abstract template method for subclass-specific facade creation.
- `initChildValidators()` — abstract template method for subclass-specific child tracking setup.
- `onDestroy()` — calls `lifecycle?.destroy()`.

### `DryvFieldValidator<TModel>` — Leaf Validator

**Location:** `src/validators/DryvFieldValidator.ts`

- Represents a single scalar field on the model.
- `value` reads/writes directly to `model[field]` (which is the Layer 1 observable proxy).
- Tracks `_initialValue` for dirty detection and revert.
- `refreshDirty()` compares current value to initial value (by identity and truthiness).
- `childValidators()` returns `[]` (leaf node).

### `DryvObjectValidator<TModel>` — Composite (Object)

**Location:** `src/validators/DryvObjectValidator.ts`

- Extends `DryvCompositeValidator`.
- Creates a Layer 1 observable proxy for the model (`createObservableProxy`) via `replaceProxy()`.
- Creates a Layer 2 facade proxy (`createObjectFacade`).
- Maintains `fields: Record<string, DryvValidator>` — one child validator per model property.
- Child validator lifecycle (creation, destruction, event-driven re-creation) is delegated to `manageChildValidators()` in `childValidatorManager.ts`.
- On full model replacement (`set value()`), tears down all children and rebuilds.

### `DryvArrayValidator<TModel>` — Composite (Array)

**Location:** `src/validators/DryvArrayValidator.ts`

- Extends `DryvCompositeValidator`.
- Creates a Layer 1 observable array proxy (`createObservableArrayProxy`), with `SpecialTypeWrapper.wrap()` applied, via `replaceProxy()`.
- Creates a Layer 2 facade proxy (`createArrayFacade`).
- Maintains `_items: DryvValidator[]` (reactive) — one child validator per array element.
- Handles `ArrayEvent`s (`append`, `insert`, `remove`, `replace`) to add/remove child validators.
- Manages item `index` updates after every array mutation.

---

## Extracted Validator Helpers

These modules were extracted from `DryvValidator` to keep concerns isolated:

| File | Purpose |
|------|---------|
| `src/validators/childValidatorManager.ts` | Manages creation, destruction, and event-driven re-creation of child validators for `DryvObjectValidator`. Defines the `ChildValidatorHost` interface. |
| `src/validators/validatorTree.ts` | `computeHierarchy()` — computes `rootModel`, `rootValidator`, `path`, `uniquePath` for a validator node given its parent context. |
| `src/validators/validatorLifecycle.ts` | `resetValidatorState()` — resets reactive state. `walkValidatorTree()` — depth-first tree walk invoking an action on each node. |
| `src/validators/serverResultMapper.ts` | `applyServerValidationResult()` — maps a server validation response onto a validator tree, setting `text`/`group`/`type` on each matching node. |
| `src/validators/serializeValidator.ts` | `serializeValidator()` — produces a plain JSON-safe snapshot of a validator's public state. |

---

## Validation Session & Rule Execution

### `DryvValidationSession`

**Location:** `src/session/DryvValidationSession.ts`

The session is the orchestrator:

- Holds the `DryvValidationRuleSet` (rules + disablers per field path).
- Creates a `DryvRuleContext` instance passed to rule `validate()` calls.
- Maintains reactive `results` with per-field and per-group result tracking.
- `validateObject()` — validates the object validator itself + all children in parallel. Aggregates results via `aggregateFieldResults()`.
- `validateField()` — runs disablers first, then validators for a single field. Mutations (`field.type`, `field.text`, `field.group`) are performed explicitly at the call site. Builds per-field results via `buildFieldResult()`.
- Tracks `_processedFields` to avoid duplicate validation within a single chain.
- Uses a `ValidationTriggerPolicy` (from `validationTriggerPolicy.ts`) to gate field validation based on the configured trigger mode.

### `DryvRuleContext`

**Location:** `src/session/DryvRuleContext.ts`

A minimal interface passed to rule `validate` functions. Decouples rules from the session:

- `callServer(url, method, data)` — delegates to `options.callServer`.
- `parseDate(date, locale, format)` — delegates to `options.parseDate`.
- `format(data, type, pattern?)` — delegates to `options.format`.
- `parameter(key)` — reads from `ruleSet.parameters`.

### Extracted Session Helpers

| File | Purpose |
|------|---------|
| `src/session/runDisablerRules.ts` | `runDisablerRules()` — runs disabler rules for a field; returns `true` if any disabler fires (validation skipped). |
| `src/session/runValidationRules.ts` | `runValidationRules()` — executes validation rules against a model field, handles related-field cross-validation via `getValidatorByPath()`, and returns the first failing result. |
| `src/session/validationResults.ts` | Result pipeline: `normalizeResults()` → `computeWarningHash()` → `buildAggregateResult()`. Also provides `successResult()`, `buildFieldResult()`, `aggregateFieldResults()`, and `hashCode()`. |
| `src/session/validationTriggerPolicy.ts` | `ValidationTriggerPolicy` interface and named policies: `immediate`, `auto`, `manual`, `autoAfterManual`. `getValidationTriggerPolicy()` resolves a name to a policy instance. |

---

## Validator Factory

**Location:** `src/validators/createValidator.ts`

`createChildValidator(parent, value, model, field, session, options)` decides which validator to instantiate using a direct `if/else` chain:

| Value type | Validator created |
|------------|-------------------|
| `function` | `null` (skipped — early return) |
| `Array` or special type (`File`, `Blob`, etc.) | `DryvFieldValidator` (array handling is via `DryvArrayValidator` at the parent level) |
| Plain `object` | `DryvObjectValidator` (recursive, with `SpecialTypeWrapper.wrap()`) |
| Primitive | `DryvFieldValidator` |

After creation, the factory checks the rule set for `required` annotations and sets `validator.required` accordingly.

---

## Utility Functions

**Location:** `src/utils/`

| File | Purpose |
|------|---------|
| `src/utils/getDryvValidator.ts` | `getDryvValidator(obj)` — extracts a `DryvValidator` from a facade or validator-like object (checks `__dryvValidator` flag and `$validator` property). |
| `src/utils/getDryvModel.ts` | `getDryvModel(obj)` — extracts the raw model via `getDryvValidator(obj)?.model`. |

---

## Internal Helpers

**Location:** `src/internal/`

Beyond the proxy layers, the `internal` module provides:

| File | Purpose |
|------|---------|
| `ProxyEventEmitter.ts` | Generic typed event emitter base class with `register()` / `unregister()` / `fire()`. |
| `computeValidatorPaths.ts` | `computeValidatorPaths()` — pure function that computes `path` and `uniquePath` from parent paths, field name, and index. |
| `getValidatorByPath.ts` | `getValidatorByPath()` — walks a validator tree by dot-separated path segments to locate a specific validator node. |
| `facadeUtils.ts` | Shared `VALIDATOR_KEY` constant and `resolveFacade()` helper used by both facade proxies. |

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
├── internal/            # Proxy layers (Layers 1–3), event emitter, path computation, facade utilities
│   ├── ProxyEventEmitter.ts     # Generic typed event emitter base class
│   ├── observableProxy.ts       # Layer 1 object proxy (FieldEvent)
│   ├── observableArrayProxy.ts  # Layer 1 array proxy (ArrayEvent)
│   ├── proxyLifecycle.ts        # Encapsulates proxy + event handler lifecycle
│   ├── createObjectFacade.ts    # Layer 2 object facade
│   ├── createArrayFacade.ts     # Layer 2 array facade
│   ├── facadeUtils.ts           # Shared VALIDATOR_KEY constant and resolveFacade() helper
│   ├── SpecialTypeWrapper.ts    # Layer 3 edge-case type wrapping
│   ├── computeValidatorPaths.ts # Pure path computation helper
│   └── getValidatorByPath.ts    # Tree lookup by dot-separated path
├── session/             # Validation session, rule context, rule runners, result aggregation
│   ├── DryvValidationSession.ts   # Session orchestrator
│   ├── DryvRuleContext.ts         # Minimal context passed to rule validate() functions
│   ├── runDisablerRules.ts        # Disabler rule execution
│   ├── runValidationRules.ts      # Validation rule execution with related-field support
│   ├── validationResults.ts       # Result normalization, aggregation, hashing pipeline
│   └── validationTriggerPolicy.ts # Trigger mode policies (immediate/auto/manual/autoAfterManual)
├── types/               # Public TypeScript interfaces and type maps
│   ├── IValidator.ts      # Core validator interface
│   ├── disposable.ts      # IDisposable interface
│   ├── events.ts          # FieldEvent, ArrayEvent types
│   ├── options.ts         # DryvOptions type
│   ├── reactiveState.ts   # DryvReactiveState interface (public shape for framework integrations)
│   ├── results.ts         # Validation result types
│   ├── rules.ts           # Validation rule and rule set types
│   └── validatable.ts     # DryvValidatableObject, DryvValidatableArray types
├── utils/               # Public utility functions
│   ├── getDryvValidator.ts  # Extract validator from facade
│   └── getDryvModel.ts     # Extract raw model from facade
├── validators/          # Validator class hierarchy, factory, and extracted helpers
│   ├── DryvValidator.ts           # Abstract base class
│   ├── DryvCompositeValidator.ts  # Shared lifecycle base for Object/Array validators
│   ├── DryvFieldValidator.ts      # Leaf validator (scalar fields)
│   ├── DryvObjectValidator.ts     # Composite validator (nested objects)
│   ├── DryvArrayValidator.ts      # Composite validator (arrays)
│   ├── createValidator.ts         # Child validator factory
│   ├── childValidatorManager.ts   # Object child validator lifecycle management
│   ├── validatorTree.ts           # Hierarchy computation (rootModel, paths)
│   ├── validatorLifecycle.ts      # State reset and tree-walk helpers
│   ├── serverResultMapper.ts      # Server validation response mapping
│   └── serializeValidator.ts      # JSON serialization helper
└── index.ts             # Public re-exports (types, validators, session, config, utils)
```
