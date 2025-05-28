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

const specialTypes = [
  // File and Blob
  File,
  //FileList,
  Blob,

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

  // DOM Elements
  //HTMLElement,
  // SVGElement,
  // Document,
  // Window,

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
