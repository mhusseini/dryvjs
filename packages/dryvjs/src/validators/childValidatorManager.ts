import type { DryvOptions, FieldEvent } from '@/types'
import type { DryvValidationSession } from '@/session/DryvValidationSession'
import type { ProxyLifecycle } from '@/internal'
import { DryvValidator } from './DryvValidator'
import { DryvObjectValidator } from './DryvObjectValidator'
import { createChildValidator } from './createValidator'

/**
 * Manages creation, destruction, and event-driven re-creation of child validators
 * for a given object validator and its proxy lifecycle.
 */
export function manageChildValidators<TModel extends object>(
  parent: DryvObjectValidator<TModel>,
  lifecycle: ProxyLifecycle<TModel, FieldEvent<TModel>>,
  session: DryvValidationSession,
  options: DryvOptions,
  fields: { [field: string | symbol | number]: DryvValidator | null }
): void {
  Object.values(fields).forEach((field) => field?.destroy())

  for (const field in lifecycle.proxy) {
    fields[field] = createChildValidator(
      parent,
      lifecycle.proxy[field],
      lifecycle.proxy,
      field,
      session,
      options
    )
  }

  lifecycle.register((event: FieldEvent<TModel>) => {
    let validator = fields[event.field]

    if (
      validator === undefined ||
      (validator instanceof DryvObjectValidator && validator.value !== event.newValue)
    ) {
      validator?.destroy()
      validator = createChildValidator(
        parent,
        event.newValue,
        lifecycle.proxy,
        event.field,
        session,
        options
      )
      fields[event.field] = validator
    }

    if (parent.isReverting || validator === null) {
      return
    }

    validator?.refreshDirty()
    validator?.validate()
  })
}
