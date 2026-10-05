import { getDryvValidator } from './getDryvValidator'

/**
 * Extracts the raw model from a facade proxy or validator-like object.
 *
 * @typeParam TModel - The expected model type.
 * @param obj - The object to extract the model from.
 * @returns The raw model, or `undefined` if no validator was found.
 */
export function getDryvModel<TModel extends object>(obj: any): TModel | undefined {
  return getDryvValidator<TModel>(obj)?.model
}
