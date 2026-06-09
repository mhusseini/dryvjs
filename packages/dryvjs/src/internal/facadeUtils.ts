import { DryvObjectValidator } from '@/validators/DryvObjectValidator'

export const VALIDATOR_KEY = '$validator'

export function resolveFacade(value: unknown): unknown {
  return value instanceof DryvObjectValidator ? value.facadeProxy : value
}
