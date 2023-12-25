import { dryvProxyHandler } from './dryvProxyHandler'
import type { DryvOptions, DryvProxy, DryvValidationSessionInternal } from './typings'
import { defaultDryvOptions } from './defaultDryvOptions'
import { isDryvProxy } from '@/dryv'
import type { DryvValidationSession } from './typings'

export function dryvProxy<TModel extends object>(
  model: TModel | DryvProxy<TModel>,
  field: keyof TModel | undefined,
  session: DryvValidationSession<TModel> | undefined,
  options?: DryvOptions
): DryvProxy<TModel> {
  if (!model) {
    throw new Error('The model cannot be null or undefined.')
  }

  if (isDryvProxy(model)) {
    return model as DryvProxy<TModel>
  }

  const sessionInternal = session as DryvValidationSessionInternal<TModel>
  sessionInternal.$initializing = true
  try {
    options = Object.assign(defaultDryvOptions, options)
    model = options.objectWrapper!(model)

    const handler = dryvProxyHandler(field, session, options)
    const proxy: DryvProxy<TModel> = new Proxy<TModel>(model, handler) as DryvProxy<TModel>

    Object.keys(model)
      .filter((prop) => !options!.excludedFields?.find((regexp) => regexp.test(prop)))
      .forEach((prop) => (proxy[prop as keyof TModel] = proxy[prop as keyof TModel]))

    return proxy
  } finally {
    sessionInternal.$initializing = false
  }
}
