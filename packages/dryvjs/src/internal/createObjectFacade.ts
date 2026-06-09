import type { DryvValidatableObject } from '@/types'
import { DryvValidator } from '@/validators/DryvValidator'
import { DryvObjectValidator } from '@/validators/DryvObjectValidator'
import { VALIDATOR_KEY, resolveFacade } from './facadeUtils'

/**
 * **Proxy Layer 2 — Developer-Facing Facade (Object)**
 *
 * Creates a Proxy over a `DryvObjectValidator` that exposes a
 * `DryvValidatableObject<TModel>` interface to consumers. Property access
 * on this proxy is transparently routed to the appropriate child validator's
 * own facade (for nested objects) or the validator itself (for fields).
 *
 * This is the primary API surface developers interact with:
 * ```ts
 * const v = createObjectValidator(model, ruleSet)
 * v.facadeProxy.name  // → DryvFieldValidator for `name`
 * v.facadeProxy.address  // → nested DryvValidatableObject
 * ```
 *
 * @see createObservableProxy        — Layer 1 (change detection, internal)
 * @see SpecialTypeWrapper     — Layer 3 (edge-case type wrapping)
 */
export function createObjectFacade<TModel extends object>(
  validator: DryvObjectValidator<TModel>
): DryvValidatableObject<TModel> {
  return new Proxy(
    validator,
    new DryvTransparentProxyHandler<TModel>()
  ) as unknown as DryvValidatableObject<TModel>
}

class DryvTransparentProxyHandler<TModel extends object> {
  ownKeys(target: DryvObjectValidator<TModel>) {
    return target.proxy ? Reflect.ownKeys(target.proxy) : []
  }

  get(target: DryvObjectValidator<TModel>, prop: string | symbol) {
    const propName = prop.toString()
    if (propName.startsWith('_') || propName.startsWith('$')) {
      return Reflect.get(target, prop)
    }

    if (prop === VALIDATOR_KEY) {
      return target
    }
    const innerValue = target.fields[prop]
    return resolveFacade(innerValue)
  }

  set(target: DryvObjectValidator<TModel>, prop: string | symbol, value: any, receiver: any) {
    const propName = prop.toString()
    if (propName.startsWith('_') || propName.startsWith('$')) {
      return Reflect.set(target, prop, value, receiver)
    }

    const validator = target.fields[prop]
    if (!(validator instanceof DryvValidator)) {
      return Reflect.set(target.fields, prop, value, receiver)
    }

    validator.value = value
    return true
  }

  has(target: DryvObjectValidator<TModel>, key: string | symbol) {
    return !!target.fields[key]
  }

  getOwnPropertyDescriptor(target: DryvObjectValidator<TModel>, key: string | symbol) {
    if (!target.fields) return undefined
    const value = target.fields[key]
    const descriptor = Reflect.getOwnPropertyDescriptor(target.fields, key)
    return value
      ? {
          value: resolveFacade(value),
          writable: value instanceof DryvObjectValidator ? false : descriptor?.writable,
          enumerable: descriptor?.enumerable,
          configurable: descriptor?.configurable
        }
      : undefined
  }
}
