import { DryvObjectValidator } from '@/validators/DryvObjectValidator'

/** Property key used by facade proxies to expose the underlying validator instance. */
export const VALIDATOR_KEY = '$validator'

/**
 * Resolves a value to its facade proxy if it is a `DryvObjectValidator`,
 * otherwise returns the value as-is. Used by both object and array facade proxies.
 */
export function resolveFacade(value: unknown): unknown {
  return value instanceof DryvObjectValidator ? value.facadeProxy : value
}
