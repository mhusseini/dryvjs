import type {
  DryvOptions,
  DryvValidatableObject,
  DryvValidationResult,
  DryvValidationRuleSet,
  DryvServerErrors,
  DryvServerValidationResponse
} from 'dryvjs'
import {
  dryvOptions,
  dryvRuleSet,
  DryvObjectValidator,
  DryvValidationSession,
  DryvValidator
} from 'dryvjs'
import { computed, isRef, watch, type Ref } from 'vue'
import { useMappedField } from './useMappedField'
import { useMappedGroup } from './useMappedGroup'

export interface UseDryvResult<TModel extends object, TParameters = object> {
  session: DryvValidationSession<TModel>
  model: TModel
  options: DryvOptions
  parameters?: TParameters
  validatable: DryvValidatableObject<TModel>
  valid: Ref<boolean>
  dirty: Ref<boolean>
  validate: () => Promise<DryvValidationResult>
  clear: () => void
  commit: () => void
  revert: () => void
  setValidationResult: (result: DryvServerValidationResponse | DryvServerErrors) => boolean

  useMappedField<TTo>(
    field: keyof TModel,
    mappedValue: Ref<TTo | undefined>
  ): DryvValidator<any, TTo>

  useMappedGroup<TTo>(groupName: string, field: Ref<TTo | undefined>): DryvValidator<any, TTo>
}

export function useDryv<TModel extends object, TParameters = object>(
  model: TModel | Ref<TModel | undefined>,
  ruleSetOrName: string | DryvValidationRuleSet<TModel, TParameters>,
  options?: DryvOptions
): UseDryvResult<TModel, TParameters> {
  const o = dryvOptions(options)
  options = o?.reactiveWrapper(o) ?? o
  const ruleSet = findRuleSet<TModel, TParameters>(ruleSetOrName)
  const session = new DryvValidationSession<TModel, TParameters>(options, ruleSet)
  let validator: DryvObjectValidator<TModel>

  if (isRef(model)) {
    const ref = model
    validator = new DryvObjectValidator<TModel>(
      model.value ?? ({} as any),
      session,
      undefined,
      options
    )
    watch(ref, (newModel) => (validator.value = newModel ?? ({} as any)))
    if (!model.value) {
      throw new Error('The initial value of the model cannot be null or undefined.')
    }
  } else {
    validator = new DryvObjectValidator<TModel>(model, session, undefined, options)
  }

  return {
    session,
    options,
    model: validator.proxy,
    parameters: ruleSet.parameters,
    validatable: validator.transparentProxy!,
    validate: async () => await validator.validate(),
    valid: computed(() => validator.isSuccess),
    dirty: computed(() => validator.isDirty),
    clear: () => validator.clear(),
    commit: () => validator.commit(),
    revert: () => validator.revert(),
    // updateModel: (newValues: TModel) => (validator.value = newValues),
    useMappedField: (field: any, mappedValue: any) =>
      useMappedField<any, any>(session, field, mappedValue),
    useMappedGroup: (groupName: string, field: Ref<unknown>) =>
      useMappedGroup(session, groupName, field),
    setValidationResult: (result: DryvServerValidationResponse | DryvServerErrors) =>
      validator.setValidationResult(result)
  } as any
}

function findRuleSet<TModel extends object, TParameters = object>(
  ruleSet: string | DryvValidationRuleSet<TModel, TParameters>
): DryvValidationRuleSet<TModel, TParameters> {
  switch (typeof ruleSet) {
    case 'undefined':
      throw new Error(
        `The ruleSet parameter must be either a valid rule set name of a valid rule set.`
      )
    case 'string': {
      const ruleSetName = ruleSet
      const foundRuleSet = dryvRuleSet<TModel, TParameters>(ruleSetName)

      if (!foundRuleSet) {
        throw new Error(`Could not find a validation rule set with the name '${ruleSetName}'`)
      }

      return foundRuleSet
    }
  }
  return ruleSet
}
