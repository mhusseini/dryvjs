/**
 * Strategy interface that determines whether field-level validation
 * should proceed based on the current session state.
 */
export interface ValidationTriggerPolicy {
  /**
   * @param isValidating - `true` if a validation pass is currently in progress.
   * @param isTriggered - `true` if validation has been manually triggered at least once.
   * @returns `true` if validation should proceed for the field.
   */
  canValidate(isValidating: boolean, isTriggered: boolean): boolean
}

const immediateTrigger: ValidationTriggerPolicy = {
  canValidate() { return true }
}

const autoTrigger: ValidationTriggerPolicy = {
  canValidate() { return true }
}

const manualTrigger: ValidationTriggerPolicy = {
  canValidate(isValidating) { return isValidating }
}

const autoAfterManualTrigger: ValidationTriggerPolicy = {
  canValidate(isValidating, isTriggered) { return isTriggered || isValidating }
}

/** Named validation trigger modes supported by the session. */
export type ValidationTriggerName = 'immediate' | 'auto' | 'manual' | 'autoAfterManual'

/**
 * Resolves a trigger name to its corresponding {@link ValidationTriggerPolicy} instance.
 * Defaults to `immediate` if the name is `undefined` or unrecognized.
 */
export function getValidationTriggerPolicy(trigger: ValidationTriggerName | undefined): ValidationTriggerPolicy {
  switch (trigger) {
    case 'immediate':
      return immediateTrigger
    case 'auto':
      return autoTrigger
    case 'manual':
      return manualTrigger
    case 'autoAfterManual':
      return autoAfterManualTrigger
    default:
      return immediateTrigger
  }
}
