/**
 * Private symbol used to recover the original object from a wrapped proxy.
 * Not exported — only accessible through {@link SpecialTypeWrapper.unwrap}.
 */
const ORIGINAL = Symbol('dryvOriginal')

/**
 * **Proxy Layer 3 — Edge-Case Type Wrapping**
 *
 * Certain JavaScript built-in types (File, ArrayBuffer, Promise, DOM elements,
 * WebAssembly objects, etc.) throw errors or behave unexpectedly when accessed
 * through a Proxy's get/set traps. `SpecialTypeWrapper` detects these types and
 * wraps them in a plain object that delegates property access explicitly,
 * preventing the observable proxy (Layer 1) from interfering with their internals.
 *
 * This layer is transparent to the rest of the system — it only activates when
 * a value of a "special" type is encountered during array proxy creation.
 *
 * The wrapped proxy carries the original object via a private Symbol so that
 * {@link unwrap} can recover it at user-facing boundaries. A `getPrototypeOf`
 * trap ensures `instanceof` checks work correctly even on wrapped values.
 *
 * @see createObservableProxy       — Layer 1 (change detection)
 * @see createObjectFacade    — Layer 2 (developer-facing facade)
 */
export class SpecialTypeWrapper {
  private constructor(private readonly item: any) {}

  /**
   * Sets a property on the wrapped object.
   * @param key - The property key.
   * @param value - The value to assign.
   */
  setValue(key: string | symbol, value: unknown) {
    this.item[key] = value
  }

  /**
   * Gets a property from the wrapped object.
   * @param key - The property key.
   * @returns The property value.
   */
  getValue(key: string | symbol): unknown {
    return this.item[key]
  }

  /**
   * Checks whether a value is an instance of a known special type
   * that would break under proxy traps.
   * @param value - The value to test.
   * @returns `true` if the value should be wrapped.
   */
  static isSpecialType(value: unknown) {
    return value === null || value === undefined
      ? false
      : specialTypes.some((type) => value instanceof type)
  }

  /**
   * Wraps a value in a proxy that delegates property access explicitly,
   * preventing Layer 1 observable proxy interference. Returns the value
   * unchanged if it is not a special type.
   *
   * The proxy carries the original object via a private Symbol (recoverable
   * through {@link unwrap}) and exposes the original's prototype chain so
   * that `instanceof` checks work correctly on the wrapped value.
   *
   * @typeParam T - The value type.
   * @param value - The value to potentially wrap.
   * @returns The original value or a safe wrapper proxy.
   */
  static wrap<T extends object>(value: T): T {
    if (!SpecialTypeWrapper.isSpecialType(value)) {
      return value
    }

    const wrapper = new SpecialTypeWrapper(value)
    return new Proxy<T>(wrapper as T, {
      get(_, prop) {
        if (prop === ORIGINAL) return value
        return wrapper.getValue(prop)
      },
      set(_, prop, value) {
        wrapper.setValue(prop, value)
        return true
      },
      has(_, prop) {
        if (prop === ORIGINAL) return true
        return prop in value
      },
      getPrototypeOf() {
        return Object.getPrototypeOf(value)
      },
      ownKeys(_: T): ArrayLike<string | symbol> {
        return []
      }
    })
  }

  /**
   * Recovers the original object from a wrapped proxy, or returns the
   * value unchanged if it was never wrapped.
   *
   * Call this at every user-facing value boundary (validator `value`
   * getters) so callers always receive the genuine object and
   * `instanceof` / strict-equality checks behave as expected.
   *
   * @typeParam T - The value type.
   * @param value - The value to potentially unwrap.
   * @returns The original unwrapped object, or the value as-is.
   */
  static unwrap<T>(value: T): T {
    if (value && typeof value === 'object' && ORIGINAL in (value as object)) {
      return (value as any)[ORIGINAL] as T
    }
    return value
  }
}

/**
 * Runtime list of constructors considered "special types" — values of these
 * types are wrapped to prevent proxy interference with their internals.
 *
 * Sync with the compile-time `SpecialType` union is enforced by the
 * compile-time assertion in `__tests__/special-type-sync.test.ts`.
 */
export const specialTypes: Function[] = [
  // File and Blob
  ...(typeof File !== 'undefined' ? [File] : []),
  ...(typeof FileList !== 'undefined' ? [FileList] : []),
  ...(typeof Blob !== 'undefined' ? [Blob] : []),

  // ArrayBuffer and Typed Arrays
  ArrayBuffer,
  DataView,
  Uint8Array,
  Uint16Array,
  Uint32Array,
  Int8Array,
  Int16Array,
  Int32Array,
  Float32Array,
  Float64Array,
  BigUint64Array,
  BigInt64Array,

  // DOM Elements (only available in browser environments)
  ...(typeof HTMLElement !== 'undefined' ? [HTMLElement] : []),
  ...(typeof SVGElement !== 'undefined' ? [SVGElement] : []),
  ...(typeof Document !== 'undefined' ? [Document] : []),
  ...(typeof Window !== 'undefined' ? [Window] : []),

  // WebAssembly
  WebAssembly.Module,
  WebAssembly.Instance,
  WebAssembly.Memory,
  WebAssembly.Table,

  // Promise and Error
  Promise,
  Error,
  TypeError,
  RangeError,
  ReferenceError,
  SyntaxError,
  URIError,
  EvalError,

  // Symbol
  Symbol
]
