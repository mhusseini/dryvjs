import type { DryvValidator } from './DryvValidator'

/**
 * Serializes a validator's public state into a plain JSON-safe object.
 * Extracted from DryvValidator.toJSON to keep serialization orthogonal to validation.
 *
 * @param v - The validator to serialize.
 * @returns A plain object snapshot of the validator's public properties.
 */
export function serializeValidator(v: DryvValidator): any {
  return {
    value: v.value,
    path: v.path,
    uniquePath: v.uniquePath,
    index: v.index,
    field: v.field || undefined,
    text: v.text,
    type: v.type,
    group: v.group,
    groupShown: v.groupShown,
    required: v.required,
    isDirty: v.isDirty,
    hasErrors: v.hasErrors,
    hasWarnings: v.hasWarnings,
    isSuccess: v.isSuccess
  }
}
