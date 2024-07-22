import { FieldEvent } from '@/.'

export interface FieldEventHandler<TModel extends object> {
  (event: FieldEvent<TModel>): void
}

export function observableProxy<TModel extends object>(model: TModel) {
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
