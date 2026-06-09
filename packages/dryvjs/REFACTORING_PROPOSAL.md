# DryvJS — Refactoring Proposal

## Current State

The codebase is well-structured with clear layering (proxy → validators → session) and a good `ARCHITECTURE.md`. The folder layout (`types/`, `validators/`, `session/`, `config/`, `internal/`) already reflects domain boundaries. The suggestions below target remaining opportunities for clarity, type safety, and reduced cognitive load.

**Total source ~1,100 LOC across ~20 files (excluding tests).**

---

## 1. Extract Reactive State from `DryvValidator`

### Problem

`DryvValidator` is ~296 lines with ~20 getters/setters that all delegate to `_reactive`. This boilerplate obscures the actual validation/lifecycle logic.

### Suggestion

Extract reactive state management into a small dedicated class:

```ts
// validators/ValidatorState.ts
export class ValidatorState {
  constructor(private _state: DryvReactiveState) {}

  get text() { return this._state.text }
  set text(v: string | null) { this._state.text = v }

  get type() { return this._state.type }
  set type(v: DryvValidationResultType | null) { this._state.type = v }

  // ... remaining fields ...

  reset(includeDirty: boolean) {
    this.type = null
    this.text = null
    this.group = null
    this.groupShown = false
    if (includeDirty) this.isDirty = false
  }
}
```

`DryvValidator` would hold a `readonly state: ValidatorState` and expose only the properties it actually needs at the validator level. This reduces the base class to ~150 lines focused on tree structure and lifecycle.

### Impact

- **High** — base class becomes scannable; each concern lives in one place.

---

## 2. Unify the Observable Proxy Event Emitter

### Problem

`ObservableProxyHandler` (observableProxy.ts) and `ObservableArrayProxyHandler` (observableArrayProxy.ts) both implement the same subscription mechanism:
- `Map<number, handler>`
- `register()` / `unregister()` / `fire()`

This is duplicated across ~20 lines in each file.

### Suggestion

Extract a generic event emitter:

```ts
// internal/ProxyEventEmitter.ts
export class ProxyEventEmitter<TEvent> {
  private readonly handlers = new Map<number, (e: TEvent) => void>()
  private nextId = 0

  register(handler: (e: TEvent) => void): number {
    this.handlers.set(++this.nextId, handler)
    return this.nextId
  }

  unregister(id: number): void {
    this.handlers.delete(id)
  }

  protected fire(event: TEvent): void {
    for (const handler of this.handlers.values()) {
      handler(event)
    }
  }
}
```

Both proxy handlers extend it, inheriting consistent behavior.

### Impact

- **Medium** — DRY, consistent behavior, easier to add features (e.g., once-listeners) later.

---

## 3. Narrow `any` Types in Key Interfaces

### Problem

Several locations weaken type safety:

| Location | Issue |
|----------|-------|
| `types/results.ts:21` | `DryvServerValidationResponse = \| any \| { ... }` — the `any` makes the structured branch unreachable for the type checker |
| `createValidator.ts` | `value: any`, fallback `{[field]: value} as any` |
| `DryvValidationSession.callServer` | Forwards to `options.callServer!` with non-null assertion — crashes if option not set |
| `getDryvValidator.ts` | Double `as any` casts |

### Suggestion

- Replace `DryvServerValidationResponse` with `unknown` + a type guard, or a proper discriminated union:
  ```ts
  export type DryvServerValidationResponse =
    | { success: boolean; messages: DryvServerErrors }
    | Record<string, DryvFieldValidationResult>
  ```
- In `createValidator`, provide explicit overloads or use conditional types to avoid the `as any` fallback.
- Guard optional callbacks: `if (!this.options.callServer) throw new DryvConfigError(...)` instead of `!` assertions.

### Impact

- **High** — prevents runtime crashes, catches misuse at compile time.

---

## 4. Remove Deprecated `dryv` Getter

### Problem

`DryvValidationSession` line 27 has:
```ts
/** @deprecated */
get dryv(): this { return this }
```

This is a compatibility shim that returns `this`. It adds confusion — newcomers wonder "what is `dryv` and how is it different from the session?"

### Suggestion

Delete it. If external consumers still reference it, add a one-line migration note in the changelog.

### Impact

- **Trivial effort, low risk** — pure cleanup.

---

## 5. Make `createValidator` a Strategy/Registry

### Problem

The factory uses nested ternaries with mixed checks:

```ts
const validator = Array.isArray(value)
  ? createFieldValidator()
  : SpecialTypeWrapper.isSpecialType(value)
    ? createFieldValidator()
    : value instanceof Object
      ? new DryvObjectValidator(...)
      : createFieldValidator()
```

This is hard to extend and hard to read at a glance.

### Suggestion

Replace with an ordered strategy list:

```ts
const strategies: ValidatorStrategy[] = [
  { matches: (v) => typeof v === 'function',         create: () => null },
  { matches: Array.isArray,                          create: createFieldValidator },
  { matches: SpecialTypeWrapper.isSpecialType,       create: createFieldValidator },
  { matches: (v) => v instanceof Object,            create: createObjectValidator },
]

// Default fallback: createFieldValidator
```

Each strategy is self-documenting. Adding a new type (e.g., `Map`) requires only adding one entry.

### Impact

- **Medium** — extensibility, readability, easier to test individual strategies.

---

## 6. Clarify Array Validator Factory Path

### Problem

`createValidator` returns a `DryvFieldValidator` for arrays — but actual array tracking is done by `DryvArrayValidator` constructed separately inside `DryvObjectValidator.updateModel`. A reader expects the single factory to be the source of truth for all validator types.

### Suggestion

Either:
1. **Have `createValidator` return `DryvArrayValidator` for arrays directly**, consolidating the factory logic, OR
2. **Rename the function** to `createChildValidator` and add a doc comment explaining that arrays have a different construction path at the parent level.

Option 1 is cleaner long-term; option 2 is lower effort.

### Impact

- **Medium** — removes a major source of confusion for newcomers.

---

## 7. Decouple Child Validator Orchestration from `DryvObjectValidator`

### Problem

`DryvObjectValidator.updateModel` handles three distinct concerns in one method:
1. Proxy lifecycle management (destroy old, create new)
2. Child validator creation for each field
3. Event handler registration + re-creation logic on mutation

### Suggestion

Extract the child-management logic into a standalone function or small class:

```ts
// validators/childValidatorManager.ts
export function manageChildValidators(
  parent: DryvObjectValidator,
  lifecycle: ProxyLifecycle<...>,
  session: DryvValidationSession,
  options: DryvOptions
): Record<string, DryvValidator | null> { ... }
```

`DryvObjectValidator` then delegates to this, keeping itself focused on being a composite tree node.

### Impact

- **Medium** — SRP improvement, testability of child management in isolation.

---

## 8. Fix Typo in `createObjectFacade.ts`

### Problem

Line 72:
```ts
const decriptor = Reflect.getOwnPropertyDescriptor(target.fields, key)
```

`decriptor` → `descriptor`.

### Impact

- **Trivial** — code correctness / searchability.

---

## 9. Consolidate Tree-Walking in `DryvValidator`

### Problem

`revert()`, `commit()`, and `clear()` all follow the same pattern:
1. Reset own state
2. Iterate `childValidators()` and call the same method recursively

This pattern is repeated three times with minor variations.

### Suggestion

Introduce a tree-traversal helper:

```ts
private walkTree(action: (v: DryvValidator) => void) {
  action(this)
  for (const child of this.childValidators()) {
    child?.walkTree(action)
  }
}
```

Then:
```ts
revert() {
  this._isReverting = true
  try { this.walkTree(v => v.resetState(true)) }
  finally { this._isReverting = false }
}

commit() { this.walkTree(v => v.resetState(true)) }
clear()  { this.walkTree(v => v.resetState(false)) }
```

### Impact

- **Low–Medium** — DRY, easier to add new tree-wide operations.

---

## 10. Make `canValidateFields` Exhaustive

### Problem

The switch statement handles `'auto'` with a no-op `break`, doesn't handle `'immediate'` (declared in the type union), and relies on fall-through to `return true`.

```ts
switch (this.options.validationTrigger) {
  case 'auto':
    break  // does nothing
  case 'manual':
    if (!this.isValidating) return false
    break
  case 'autoAfterManual':
    if (!this._isTriggered && !this.isValidating) return false
    break
  // 'immediate' — not handled
}
return true
```

### Suggestion

Make the intent explicit:

```ts
private canValidateFields(): boolean {
  switch (this.options.validationTrigger) {
    case 'immediate':
    case 'auto':
      return true
    case 'manual':
      return this.isValidating
    case 'autoAfterManual':
      return this._isTriggered || this.isValidating
    default:
      return true
  }
}
```

### Impact

- **Trivial effort** — prevents future bugs when new trigger modes are added.

---

## Summary

| # | Refactoring | Effort | Impact | Risk |
|---|-------------|--------|--------|------|
| 1 | Extract reactive state class | Medium | High | Low |
| 2 | Unify event emitter pattern | Low | Medium | Low |
| 3 | Narrow `any` types | Low–Medium | High | Low |
| 4 | Remove deprecated `dryv` getter | Trivial | Low | None |
| 5 | Strategy pattern in `createValidator` | Low | Medium | Low |
| 6 | Clarify array validator factory path | Low | Medium | Low |
| 7 | Extract child validator management | Medium | Medium | Low |
| 8 | Fix typo `decriptor` | Trivial | Trivial | None |
| 9 | Tree-walk helper for revert/commit/clear | Low | Low–Medium | None |
| 10 | Exhaustive switch in `canValidateFields` | Trivial | Low | None |

---

## Recommended Execution Order

**Phase 1 — Quick wins (trivial risk):**
- Items 4, 8, 10

**Phase 2 — Type safety & clarity:**
- Items 3, 5, 6

**Phase 3 — Structural improvements:**
- Items 1, 2, 7, 9

---

## Guiding Principles

- **Single Responsibility:** Each class/function should have one reason to change.
- **Type Everything:** `any` is only acceptable at framework boundaries (e.g., JSON parsing).
- **Favor Composition:** Extract helpers/strategies over adding more to base classes.
- **Name for Newcomers:** Choose names that communicate *purpose*, not *mechanism*.
- **Minimal Inheritance:** Prefer flat hierarchies + delegation over deep class chains.
