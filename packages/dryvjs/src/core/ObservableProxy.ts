import { FieldEvent } from './'

export function observableProxy<TModel extends object>(model: TModel) {
  const proxy = new Proxy(model, {
    set(target, prop, value, receiver) {
      const oldValue = Reflect.get(target, prop, receiver)
      const result = Reflect.set(target, prop, value, receiver)

      if (result && oldValue !== value) {
        fire({ oldValue, newValue: value, field: prop as keyof TModel })
      }

      return result
    }
  })

  const callbacks = new Map<number, (event: FieldEvent<TModel>) => void>()
  let nextId = 0

  return {
    proxy,
    register,
    unregister
  }

  function register(callback: (event: FieldEvent<TModel>) => void): number {
    callbacks.set(++nextId, callback)
    return nextId
  }

  function unregister(id: number) {
    callbacks.delete(id)
  }

  function fire(event: FieldEvent<TModel>) {
    for (const callback of callbacks.values()) {
      callback(event)
    }
  }
}
