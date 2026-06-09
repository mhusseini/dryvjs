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
 * @see createObservableProxy       — Layer 1 (change detection)
 * @see createObjectFacade    — Layer 2 (developer-facing facade)
 */
export class SpecialTypeWrapper {
  private constructor(private readonly item: any) {}

  setValue(key: string | symbol, value: unknown) {
    this.item[key] = value
  }

  getValue(key: string | symbol): unknown {
    return this.item[key]
  }

  static isSpecialType(value: unknown) {
    return value === null || value === undefined
      ? false
      : specialTypes.some((type) => value instanceof type)
  }

  static wrap<T extends object>(value: T): T {
    if (!SpecialTypeWrapper.isSpecialType(value)) {
      return value
    }

    const wrapper = new SpecialTypeWrapper(value)
    return new Proxy<T>(wrapper as T, {
      get(_, prop) {
        return wrapper.getValue(prop)
      },
      set(_, prop, value) {
        wrapper.setValue(prop, value)
        return true
      },
      ownKeys(_: T): ArrayLike<string | symbol> {
        return []
      }
    })
  }
}

/**
 * Runtime list of constructors considered "special types" — values of these
 * types are wrapped to prevent proxy interference with their internals.
 *
 * IMPORTANT: Keep in sync with the compile-time `SpecialType` union in
 * `src/types/validatable.ts`. When adding entries here, also add the
 * corresponding type to that union.
 */
const specialTypes: Function[] = [
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
