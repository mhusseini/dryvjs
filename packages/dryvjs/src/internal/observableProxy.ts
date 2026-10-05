import type { FieldEvent } from '@/types'
import { ProxyEventEmitter } from './ProxyEventEmitter'

/**
 * Callback signature for handlers that receive field mutation events.
 *
 * @typeParam TModel - The model type whose field was mutated.
 */
export interface FieldEventHandler<TModel extends object> {
  (event: FieldEvent<TModel>): void
}

/**
 * **Proxy Layer 1 — Change Detection (Observable Proxy)**
 *
 * Wraps a plain model object in a Proxy that intercepts property assignments
 * (`set` trap) and emits `FieldEvent`s to registered handlers.
 *
 * This layer is consumed exclusively by `DryvObjectValidator` to detect when
 * the user mutates a model field, triggering dirty-tracking and re-validation.
 *
 * Consumers never see this proxy directly — it is an internal implementation
 * detail hidden behind the validator's `proxy` property.
 *
 * @see observableArrayProxy — analogous layer for array mutations
 * @see createObjectFacade   — Layer 2 (developer-facing facade)
 */
export function createObservableProxy<TModel extends object>(model: TModel) {
  const proxyHandler = new ObservableProxyHandler<TModel>()
  const proxy = new Proxy(model, proxyHandler)

  return {
    proxy,
    register: (eventHandler: FieldEventHandler<TModel>) => proxyHandler.register(eventHandler),
    unregister: (id: number) => proxyHandler.unregister(id)
  }
}

/**
 * Proxy handler that intercepts property assignments on a model object
 * and fires {@link FieldEvent}s when values change.
 * Properties prefixed with `_` or `$` are passed through without events.
 */
class ObservableProxyHandler<TModel extends object> extends ProxyEventEmitter<FieldEvent<TModel>> {
  set(target: TModel, prop: string | symbol, value: any, receiver: any) {
    const propName = prop.toString()
    if(propName.startsWith('_') || propName.startsWith('$')) {
      return Reflect.set(target, prop, value, receiver)
    }

    const oldValue = Reflect.get(target, prop, receiver)
    const result = Reflect.set(target, prop, value, receiver)

    if (result && oldValue !== value) {
      this.fire({ oldValue, newValue: value, field: prop as keyof TModel })
    }

    return result
  }
}
