# dryvjs — Refactoring Proposal

## Current State

The codebase has a clean layered architecture (observable proxies → validators → session → facade). Previous refactoring rounds have already introduced `ProxyEventEmitter`, `ValidatorState`, `childValidatorManager`, `walkTree`, and the strategy pattern in `createValidator`. This proposal targets the **remaining** opportunities for clarity, reduced indirection, and better type safety.

**Total source ~1,200 LOC across ~25 files (excluding tests).**

---

## 1. Flatten the Double-Delegation for Reactive State

### Problem

`DryvValidator` has 8 getter/setter pairs (lines 51–97) that delegate to `ValidatorState`, which in turn delegates to the `DryvReactiveState` object. This creates a three-layer read/write chain:

```
DryvValidator.text → ValidatorState.text → _state.text
```

`ValidatorState` adds no logic beyond a `reset()` helper. Both `DryvValidator` and `ValidatorState` contain pure pass-through getters/setters that inflate the class surface without adding meaning.

### Proposal

**Eliminate `ValidatorState`** as a separate class. Move `reset()` into `DryvValidator` as a private method and hold the reactive state object directly:

```ts
// Before (3 hops)
get text() { return this.state.text }      // DryvValidator
get text() { return this._state.text }     // ValidatorState

// After (1 hop)
get text() { return this._reactive.text }  // DryvValidator only
```

### Affected files

- `src/validators/ValidatorState.ts` — delete
- `src/validators/DryvValidator.ts` — inline state access + `reset()` method

### Impact

- **High clarity** — removes an entire unnecessary abstraction layer.
- **Low risk** — no external API change; the `state` field is not part of the public contract.

---

## 2. Extract Session Utility Methods into a Rule Context

### Problem

`DryvValidationSession` serves two distinct roles:
1. **Orchestration** — validation chains, trigger logic, field processing.
2. **Utility bag** — `callServer()`, `handleResult()`, `parseDate()`, `format()` are one-liner delegates to `options.*`.

Rule functions receive the entire `session` object just to access these utilities. This over-couples rule execution to the session class.

### Proposal

Extract a **`DryvRuleContext`** object containing only what rules need:

```ts
// src/session/DryvRuleContext.ts
export class DryvRuleContext<TModel extends object> {
  constructor(private options: DryvOptions, private ruleSet: DryvValidationRuleSet<TModel>) {}

  callServer(url: string, method: string, data: any) { return this.options.callServer!(url, method, data) }
  parseDate(date: string, locale: string, format: string) { return this.options.parseDate!(date, locale, format) }
  format(data: any, type: string, pattern?: string) { return this.options.format!(data, type, pattern) }
  parameter(key: string) { return this.ruleSet.parameters?.[key] }
}
```

The session creates one `DryvRuleContext` instance and passes it to rule `validate()` calls. The session itself shrinks to pure orchestration.

> **Breaking change note:** The `validate` signature in `DryvValidationRule` would change from `session` to `context`. Gate behind a major version or provide a backward-compatible adapter.

### Affected files

- `src/session/DryvValidationSession.ts` — remove utility methods, create context
- `src/types/rules.ts` — update `validate` parameter type
- New file: `src/session/DryvRuleContext.ts`

### Impact

- **High** — Single Responsibility for the session; rules get a minimal, stable interface.
- **Risk: High** — breaking change for rule authors.

---

## 3. Unify Observable Proxy Factory Naming

### Problem

The two Layer 1 factory functions have inconsistent naming:
- `createObservableProxy` (for objects — uses `create` prefix)
- `observableArrayProxy` (for arrays — no `create` prefix)

### Proposal

Rename `observableArrayProxy` → `createObservableArrayProxy`.

### Affected files

- `src/internal/observableArrayProxy.ts` — rename exported function
- `src/validators/DryvArrayValidator.ts` — update import/call
- `src/internal/index.ts` — update re-export

### Impact

- **Consistency** — trivial effort, no behavioral change.

---

## 4. Extract Shared Lifecycle Pattern into a Composite Base

### Problem

`DryvObjectValidator` and `DryvArrayValidator` duplicate the same structural pattern:
1. Store a `_lifecycle?: ProxyLifecycle<...>` field.
2. An `updateModel`/`updateArray` method that destroys old lifecycle → creates new proxy/lifecycle → assigns `this.proxy` → registers handler.
3. Override `onDestroy()` to call `this._lifecycle?.destroy()`.

### Proposal

Introduce a thin **`DryvCompositeValidator`** abstract class between `DryvValidator` and the two composites:

```ts
// src/validators/DryvCompositeValidator.ts
export abstract class DryvCompositeValidator<TModel extends object, TProxy, TEvent>
  extends DryvValidator<TModel, TProxy> {

  protected lifecycle?: ProxyLifecycle<TProxy, TEvent>
  proxy!: TProxy

  protected replaceProxy(
    factory: () => ProxyLifecycle<TProxy, TEvent>,
    handler: (e: TEvent) => void
  ): TProxy {
    this.lifecycle?.destroy()
    this.lifecycle = factory()
    this.proxy = this.lifecycle.proxy
    this.lifecycle.register(handler)
    return this.proxy
  }

  override onDestroy() { this.lifecycle?.destroy() }
}
```

`DryvObjectValidator` and `DryvArrayValidator` then only supply the factory function and handler, removing ~15 lines of structural duplication each.

### Affected files

- New: `src/validators/DryvCompositeValidator.ts`
- `src/validators/DryvObjectValidator.ts` — extend new base
- `src/validators/DryvArrayValidator.ts` — extend new base

### Impact

- **Medium** — DRY, centralizes lifecycle ownership.
- **Low risk** — internal class hierarchy change; no public API surface change.

---

## 5. Remove the Strategy Array in `createValidator`

### Problem

`createValidator.ts` uses a `ValidatorStrategy[]` array + `find()` for what is a 4-branch decision:

```ts
const strategies: ValidatorStrategy[] = [
  { matches: (v) => typeof v === 'function',             create: 'skip' },
  { matches: (v) => Array.isArray(v),                    create: 'field' },
  { matches: (v) => SpecialTypeWrapper.isSpecialType(v), create: 'field' },
  { matches: (v) => v instanceof Object,                 create: 'object' },
]
```

This is never extended at runtime, never configured by users, and never iterated generically. It adds indirection (a private interface, an array, a `find()` call, a string-to-action map) for no extensibility benefit.

### Proposal

Replace with a direct `if/else` chain:

```ts
export function createChildValidator<TModel>(...): DryvValidator | null {
  if (typeof value === 'function') return null
  if (Array.isArray(value) || SpecialTypeWrapper.isSpecialType(value)) {
    return new DryvFieldValidator(...)
  }
  if (value instanceof Object) {
    return new DryvObjectValidator(...)
  }
  return new DryvFieldValidator(...)
}
```

Fewer allocations, immediately scannable, trivially debuggable.

### Affected files

- `src/validators/createValidator.ts`

### Impact

- **High clarity** — removes unnecessary abstraction.
- **No risk** — same runtime behavior.

---

## 6. Move `DryvReactiveState` to `src/types/`

### Problem

`DryvReactiveState` is defined inside `DryvValidator.ts` (line 14) but describes a public data shape that framework integrations need to know about (e.g., Vue `reactive()` wrapper must match this shape). Defining it inside a class file makes it hard to discover.

### Proposal

Move to `src/types/reactiveState.ts` and re-export from the types barrel.

### Affected files

- `src/validators/DryvValidator.ts` — remove interface, import from types
- New: `src/types/reactiveState.ts`
- `src/types/index.ts` — re-export

### Impact

- **Discoverability** — trivial effort.

---

## 7. Reduce `any` Usage in Core Classes

### Problem

| Location | Field/Param | Issue |
|----------|-------------|-------|
| `DryvValidator._facadeProxy` | `?: any` | Could be typed as a generic or known union |
| `DryvValidator._rootModel` | `: any` | Should be `TModel` — already on the class generic |
| `DryvValidator.setValidationResult` | `(response as any)?.success` | Unsafe cast; use type guard |
| `DryvArrayValidator` constructor | `field?: keyof any` | Confusing; means `PropertyKey` |
| `createObjectFacade` return | `as unknown as` | Acceptable at proxy boundary |
| `defaultDryvOptions.handleResult` | 4 unused params as `_` | Use `_p1, _p2` or typed callback |

### Proposal

- Replace `_rootModel: any` → `_rootModel: TModel`.
- Type `_facadeProxy` as `DryvValidatableObject<TModel> | DryvValidatableArray<any> | undefined`.
- Replace `keyof any` → `PropertyKey`.
- Add a type guard for `DryvServerValidationResponse`:

```ts
function isStructuredResponse(r: any): r is { success: boolean; messages: DryvServerErrors } {
  return typeof r?.success === 'boolean'
}
```

### Affected files

- `src/validators/DryvValidator.ts`
- `src/validators/DryvArrayValidator.ts`
- `src/types/results.ts` — add type guard

### Impact

- **Type safety** — catches misuse at compile time.
- **Low risk** — no runtime behavior change.

---

## 8. Consolidate the "Special Types" Lists

### Problem

The set of special types exists in two places that must stay in sync:
1. `src/internal/SpecialTypeWrapper.ts` — runtime `specialTypes` array (used for `instanceof`).
2. `src/types/validatable.ts` — compile-time `SpecialType` union (used in type mapping).

They already **differ**: the type union includes `HTMLElement`, `SVGElement`, `Document`, `Window` which the runtime list omits.

### Proposal

- Synchronize both lists immediately.
- Add a cross-reference comment in each file pointing to the other.
- Long-term: consider exporting a `SPECIAL_TYPE_CONSTRUCTORS` array from `SpecialTypeWrapper.ts` and using `InstanceType<typeof SPECIAL_TYPE_CONSTRUCTORS[number]>` to derive the type union (requires a build step or manual type assertion).

### Affected files

- `src/internal/SpecialTypeWrapper.ts` — add missing types or doc
- `src/types/validatable.ts` — sync + cross-reference comment

### Impact

- **Maintainability** — prevents silent divergence.

---

## 9. Make `applyFieldResult` a Pure Function

### Problem

`applyFieldResult` in `validationResults.ts` **mutates** the passed `field` validator (`field.type = ...`, `field.text = ...`). This side-effect is hidden inside a file named "validationResults" — a reader expects result construction logic, not validator mutation.

### Proposal

Split into two:
1. **`buildFieldResult(result, path)`** — pure function returning `DryvValidationResult`.
2. **Caller in `DryvValidationSession.validateField()`** — performs the mutation explicitly:

```ts
const result = buildFieldResult(fieldResult, field.path!)
field.type = fieldResult?.type ?? 'success'
field.text = fieldResult?.text ?? null
field.group = fieldResult?.group ?? null
```

The data flow is now visible at the call site.

### Affected files

- `src/session/validationResults.ts` — remove mutation from `applyFieldResult`
- `src/session/DryvValidationSession.ts` — inline mutation at call site

### Impact

- **Clarity** — side-effects are explicit, pure helpers stay pure.
- **Low risk** — same behavior, just relocated.

---

## 10. Replace Global Mutable `defaultDryvRuleSetResolvers`

### Problem

`defaultDryvRuleSetResolvers` is a module-level mutable array (`export const ... = []`). External code mutates it via `.push()`. This is global state that:
- Makes testing difficult (shared between test runs without cleanup).
- Creates ordering dependencies.
- Is invisible in the constructor chain.

### Proposal

Move resolvers into `DryvOptions`:

```ts
// In DryvOptions:
ruleSetResolvers?: DryvValidationRuleSetResolver[]
```

The `dryvRuleSet()` function then accepts resolvers as a parameter (or reads from options) instead of a global array. Remove the exported mutable array.

### Affected files

- `src/config/defaultDryvOptions.ts` — remove `defaultDryvRuleSetResolvers`
- `src/config/dryvRuleSet.ts` — accept resolvers as argument
- `src/types/options.ts` — add `ruleSetResolvers` field

### Impact

- **Testability** — no global state leakage.
- **Medium risk** — breaking for code that pushes to the array.

---

## 11. Simplify the `parent` Setter Side-Effects

### Problem

Setting `parent` on a `DryvValidator` triggers `updateHierarchy()` and `onParentChanged()` as a side-effect. This means construction order matters — assigning `parent` before other fields are ready causes cascading path recomputations with potentially incomplete data.

```ts
set parent(parent) {
  this._parent = parent
  this.updateHierarchy()    // recomputes paths for self + children
  this.onParentChanged()    // hook for subclass (DryvArrayValidator nulls rootModel)
}
```

### Proposal

- Make `parent` assignment inert (store reference only).
- Introduce an explicit **`attachToTree(parent)`** method that performs hierarchy setup.
- Call `attachToTree()` once in the factory (`createChildValidator`) after the validator is fully constructed.

```ts
set parent(value) { this._parent = value }  // no side effects

attachToTree(parent?: DryvValidator) {
  this._parent = parent
  this.updateHierarchy()
  this.onParentChanged()
}
```

### Affected files

- `src/validators/DryvValidator.ts` — split setter from `attachToTree`
- `src/validators/createValidator.ts` — call `attachToTree` after construction
- `src/validators/childValidatorManager.ts` — update attachment point

### Impact

- **Predictability** — construction and tree-linking are separate phases.
- **Medium risk** — subtle ordering changes; needs thorough test coverage.

---

## 12. Give Facade Proxy Handlers a Shared Utility

### Problem

`DryvTransparentProxyHandler` (object facade) and `DryvTransparentArrayProxyHandler` (array facade) both implement:
- `$validator` escape-hatch logic.
- Child resolution: `value instanceof DryvObjectValidator ? value.facadeProxy : value`.

These are copy-pasted with minor variations. If the `$validator` key ever changes or the resolution logic needs updating, both files must be touched.

### Proposal

Extract shared helpers:

```ts
// src/internal/facadeUtils.ts
export const VALIDATOR_KEY = '$validator'

export function resolveFacade(value: unknown): unknown {
  return value instanceof DryvObjectValidator ? value.facadeProxy : value
}
```

Both handlers import and use these, keeping them in sync by construction.

### Affected files

- New: `src/internal/facadeUtils.ts`
- `src/internal/createObjectFacade.ts` — use shared helpers
- `src/internal/createArrayFacade.ts` — use shared helpers

### Impact

- **Consistency** — one place to change.
- **No risk** — pure extraction.

---

## Summary — Priority Matrix

| # | Refactoring | Effort | Clarity | Safety | Risk |
|---|-------------|--------|---------|--------|------|
| 5 | Remove strategy over-engineering | Low | High | — | None |
| 3 | Unify factory naming | Trivial | Medium | — | None |
| 6 | Move `DryvReactiveState` to types | Trivial | Medium | — | None |
| 8 | Consolidate special types lists | Low | Medium | — | None |
| 9 | Make `applyFieldResult` pure | Low | High | — | Low |
| 12 | Shared facade utilities | Low | Medium | — | None |
| 7 | Reduce `any` usage | Medium | Medium | High | Low |
| 1 | Flatten state delegation | Medium | High | — | Low |
| 4 | Extract composite validator base | Medium | Medium | — | Low |
| 11 | Simplify parent setter | Medium | High | — | Medium |
| 10 | Remove global mutable resolvers | Medium | Medium | High | Medium |
| 2 | Extract rule context from session | High | High | — | High |

---

## Recommended Execution Order

**Phase 1 — Quick wins (no risk, high clarity payoff):**
- Items 5, 3, 6, 8, 12

**Phase 2 — Structural improvements (low risk):**
- Items 9, 7, 1, 4

**Phase 3 — Behavioral changes (require major version or migration path):**
- Items 11, 10, 2

---

## Guiding Principles

- **Eliminate indirection that doesn't earn its keep** — abstractions should save more complexity than they introduce.
- **Type everything** — `any` is only acceptable at proxy/serialization boundaries.
- **Side effects must be visible at the call site** — don't hide mutation in "helper" functions.
- **Name for newcomers** — choose names that communicate *purpose* over *mechanism*.
- **Prefer flat structures** — one level of delegation is almost always enough.
