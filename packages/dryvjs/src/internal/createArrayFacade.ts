import type { DryvValidatableArray } from '@/types'
import type { DryvValidator } from '@/validators/DryvValidator'
import { DryvArrayValidator } from '@/validators/DryvArrayValidator'
import { VALIDATOR_KEY, resolveFacade } from './facadeUtils'

/**
 * **Proxy Layer 2 — Developer-Facing Facade (Array)**
 *
 * Creates a Proxy over the array validator's child list that exposes a
 * `DryvValidatableArray<TModel>` interface to consumers. Index access
 * returns the child validator's facade; array methods (push, splice, etc.)
 * are forwarded to the underlying observable array proxy.
 *
 * @see observableArrayProxy  — Layer 1 (change detection, internal)
 * @see createObjectFacade    — Layer 2 for objects
 * @see SpecialTypeWrapper    — Layer 3 (edge-case type wrapping)
 */
export function createArrayFacade<TModel>(
  validator: DryvArrayValidator<TModel>
): DryvValidatableArray<TModel> {
  return new Proxy(
    validator.childValidators(),
    new DryvTransparentArrayProxyHandler(validator)
  ) as any as DryvValidatableArray<TModel>
}

/**
 * Proxy handler implementing the array facade.
 * Numeric index access returns the child validator's facade;
 * non-numeric property access (e.g. `push`) is forwarded to the observable array proxy.
 */
class DryvTransparentArrayProxyHandler<TModel = any> {
  constructor(private validator: DryvArrayValidator<TModel>) {}

  get(target: DryvValidator[], prop: string | symbol) {
    if (prop === VALIDATOR_KEY) {
      return this.validator
    }
    if (!/^\d+$/.test(String(prop))) {
      const maybeFunction = this.validator.proxy[String(prop) as any] as any
      if (typeof maybeFunction === 'function') {
        return maybeFunction.bind(this.validator.proxy)
      }
    }
    const value = (target as any)[prop]
    return resolveFacade(value)
  }

  apply(target: DryvValidator[], thisArg: any, argArray: any) {
    return (target as any)[thisArg].apply(target, argArray)
  }
}
