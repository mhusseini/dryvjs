import { DryvCompositeValidator } from '@/validators/DryvCompositeValidator'

/** Property key used by facade proxies to expose the underlying validator instance. */
export const VALIDATOR_KEY = '$validator'

/**
 * Resolves a value to its facade proxy if it is a composite validator
 * (object or array), otherwise returns the value as-is.
 * Used by both object and array facade proxies.
 */
export function resolveFacade(value: unknown): unknown {
  return value instanceof DryvCompositeValidator ? value.facadeProxy : value
}
