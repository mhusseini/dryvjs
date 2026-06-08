import type { DryvValidationSession, DryvValidationRule, DryvValidationResult } from 'dryvue'
import { useNuxtApp } from '#imports'

export type ResultHandler = <TModel extends object>(
  session: DryvValidationSession<TModel>,
  model: TModel,
  path: string,
  rule: DryvValidationRule<TModel>,
  result: DryvValidationResult,
) => Promise<DryvValidationResult | undefined>

interface DryvHandlerRegistry {
  handlerKey: number
  resultHandlers: { [key: number]: ResultHandler }
}

function useDryvHandlerRegistry(): DryvHandlerRegistry {
  const nuxtApp = useNuxtApp()

  if (!(nuxtApp as any)._dryvHandlerRegistry) {
    ;(nuxtApp as any)._dryvHandlerRegistry = {
      handlerKey: 0,
      resultHandlers: {},
    }
  }

  return (nuxtApp as any)._dryvHandlerRegistry as DryvHandlerRegistry
}

/**
 * Register a custom result handler that can intercept and transform validation results.
 * Returns a numeric key that can be used with `removeResultHandler` to unregister.
 */
export function addResultHandler(handler: ResultHandler): number {
  const registry = useDryvHandlerRegistry()
  const key = registry.handlerKey++
  registry.resultHandlers[key] = handler
  return key
}

/**
 * Unregister a previously registered result handler by its key.
 */
export function removeResultHandler(key: number) {
  const registry = useDryvHandlerRegistry()
  delete registry.resultHandlers[key]
}

/**
 * @internal
 * Iterate all registered result handlers for a given validation result.
 */
export async function invokeResultHandlers<TModel extends object>(
  session: DryvValidationSession<TModel>,
  model: TModel,
  path: string,
  rule: DryvValidationRule<TModel>,
  result: DryvValidationResult,
): Promise<DryvValidationResult> {
  const registry = useDryvHandlerRegistry()

  for (const key in registry.resultHandlers) {
    const handler = registry.resultHandlers[key]
    if (!handler) continue
    const handlerResult = await handler(session, model, path, rule, result)
    if (handlerResult !== undefined) {
      return handlerResult
    }
  }

  return result
}
