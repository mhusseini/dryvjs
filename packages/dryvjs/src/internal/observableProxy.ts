import type { FieldEvent } from '@/types'

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

class ObservableProxyHandler<TModel extends object> {
  private readonly _eventHandlers = new Map<number, (event: FieldEvent<TModel>) => void>()
  private _nextId = 0

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

  register(eventHandler: FieldEventHandler<TModel>): number {
    this._eventHandlers.set(++this._nextId, eventHandler)
    return this._nextId
  }

  unregister(id: number) {
    this._eventHandlers.delete(id)
  }

  private fire(event: FieldEvent<TModel>) {
    for (const eventHandler of this._eventHandlers.values()) {
      eventHandler(event)
    }
  }
}
