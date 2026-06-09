import type { DryvOptions, FieldEvent } from '@/types'
import type { DryvValidationSession } from '@/session/DryvValidationSession'
import type { ProxyLifecycle } from '@/internal'
import { DryvValidator } from './DryvValidator'
import { DryvObjectValidator } from './DryvObjectValidator'
import { createChildValidator } from './createValidator'

/**
 * Minimal interface for the host validator that owns child validators.
 * Decouples childValidatorManager from the concrete DryvObjectValidator class.
 */
export interface ChildValidatorHost {
  /** `true` while a revert operation is in progress (suppresses re-validation). */
  readonly isReverting: boolean
  /** Map of field names to their child validators. */
  fields: { [field: string | symbol | number]: DryvValidator | null }
}

/**
 * Manages creation, destruction, and event-driven re-creation of child validators
 * for a given object validator and its proxy lifecycle.
 *
 * @typeParam TModel - The model type.
 * @param parent - The host validator that owns the child validators.
 * @param lifecycle - The proxy lifecycle providing the observable proxy and event registration.
 * @param session - The current validation session.
 * @param options - Resolved options.
 */
export function manageChildValidators<TModel extends object>(
  parent: DryvValidator & ChildValidatorHost,
  lifecycle: ProxyLifecycle<TModel, FieldEvent<TModel>>,
  session: DryvValidationSession,
  options: DryvOptions
): void {
  Object.values(parent.fields).forEach((field) => field?.destroy())

  for (const field in lifecycle.proxy) {
    parent.fields[field] = createChildValidator(
      parent,
      lifecycle.proxy[field],
      lifecycle.proxy,
      field,
      session,
      options
    )
  }

  lifecycle.register((event: FieldEvent<TModel>) => {
    let validator = parent.fields[event.field]

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
      parent.fields[event.field] = validator
    }

    if (parent.isReverting || validator === null) {
      return
    }

    validator?.refreshDirty()
    validator?.validate()
  })
}
